package services

import models.{BinRange, CardInfo, CardType, MerchantConfig, Quote, QuoteError, QuoteRequest}
import org.scalatestplus.play.PlaySpec

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._
import scala.concurrent.{Await, Future}

// One check per rule in docs/surcharging.md. Where there's a seed payment that got it wrong, it's named
class QuoteServiceSpec extends PlaySpec {

  val Merchants = Seq(
    MerchantConfig("mer_001", "Blue Ridge Outfitters", "USD", 3.0, surchargeEnabled = true),
    MerchantConfig("mer_002", "Harbor Dental Group", "USD", 2.5, surchargeEnabled = true),
    MerchantConfig("mer_003", "Sakura Imports", "JPY", 3.0, surchargeEnabled = true),
    // opted out, with a rate left over from before, which must still never apply
    MerchantConfig("mer_005", "Opted Out", "USD", 3.0, surchargeEnabled = false)
  ).map(m => m.merchantId -> m).toMap

  object StubDirectory extends MerchantDirectory(null) {
    override def find(merchantId: String): Future[Option[MerchantConfig]] = Future.successful(Merchants.get(merchantId))
  }

  val Credit = "41111111"
  val Debit = "40000566"
  val Prepaid = "48471800"
  val NotInTable = "63900000"

  val Bins = new BinTable(Vector(
    BinRange("40000000", "40009999", "VISA", CardType.Credit, "US"),
    BinRange("40000500", "40000599", "VISA", CardType.Debit, "US"),
    BinRange("41111100", "41111199", "VISA", CardType.Credit, "US"),
    BinRange("48471800", "48471899", "VISA", CardType.Prepaid, "US")
  ))

  val service = new QuoteService(StubDirectory, Bins)

  def quote(merchantId: String, amount: Double, bin: String, svc: QuoteService = service): Either[QuoteError, Quote] =
    Await.result(svc.quote(QuoteRequest(merchantId, amount, bin)), 5.seconds)

  def ok(merchantId: String, amount: Double, bin: String, svc: QuoteService = service): Quote =
    quote(merchantId, amount, bin, svc).fold(e => fail(s"expected a quote, got $e"), identity)

  def mustNotSurcharge(q: Quote): Unit = {
    q.surchargeable mustBe false
    q.rate mustBe 0.0
    q.surcharge mustBe 0.0
    q.total mustBe q.amount
  }

  "Rule 1, credit cards only" should {

    "surcharge a credit card" in {
      // pay_01a0495b0cf8709284b7351b47dd1aa1, a correct one
      val q = ok("mer_001", 417.24, Credit)
      q.surchargeable mustBe true
      q.surcharge mustBe 12.52
      q.total mustBe 429.76
    }

    "never surcharge a debit card" in {
      // pay_01a0496db26874128369ee59929cf35a, a correct one
      mustNotSurcharge(ok("mer_002", 480, Debit))
    }

    "never surcharge a prepaid card" in {
      // pay_01a04a1a0b80710e9cc9e55ce22aa365 was surcharged 28.30, and 39 more prepaid payments like it
      mustNotSurcharge(ok("mer_002", 1132, Prepaid))
      // pay_01a04a10e3c07928a685de685b7c1ae6 was surcharged ¥522.45
      mustNotSurcharge(ok("mer_003", 17415, Prepaid))
    }
  }

  "Rule 2, if in doubt, don't" should {

    "not surcharge a bin that isn't in the table" in {
      val q = ok("mer_001", 100, NotInTable)
      q.cardType mustBe CardType.Unknown
      mustNotSurcharge(q)
    }

    "not surcharge when the lookup fails" in {
      val failing = new BinTable(Vector.empty) {
        override def lookup(bin: String): Option[CardInfo] = throw new RuntimeException("bin table unavailable")
      }
      val q = ok("mer_001", 100, Credit, new QuoteService(StubDirectory, failing))
      q.cardType mustBe CardType.Unknown
      mustNotSurcharge(q)
    }

    "not guess the card type from a bin shorter than 8 digits" in {
      // "400005" padded to 40000500 would land in the debit range, and 400006 in credit: the prefix can't tell us
      mustNotSurcharge(ok("mer_001", 100, "411111"))
      mustNotSurcharge(ok("mer_001", 100, ""))
    }

    "use the first 8 digits of a full card number" in {
      ok("mer_001", 100, "4111 1111 1111 1111").surchargeable mustBe true
    }
  }

  "Rule 3, how much" should {

    // INC-4471: pay_01a15f0586407084beccb042d5037e53 was charged $4.62, the terminal showed $4.63
    "round half up to the cent" in {
      val q = ok("mer_002", 185.00, Credit)
      q.surcharge mustBe 4.63
      q.total mustBe 189.63
    }

    "round to the whole yen" in {
      // pay_01a04daf098074f1bd48244282b7a479 was surcharged ¥1,425.45
      val q = ok("mer_003", 47515, Credit)
      q.surcharge mustBe 1425
      q.total mustBe 48940
      // pay_01a0627f3d0877dd83c1da0aa86f06da was surcharged ¥1,522.50
      ok("mer_003", 50750, Credit).surcharge mustBe 1523
    }

    "reject an amount finer than the currency's smallest unit" in {
      quote("mer_001", 10.005, Credit) mustBe Left(QuoteError.InvalidAmount)
      quote("mer_003", 100.5, Credit) mustBe Left(QuoteError.InvalidAmount)
    }

    "reject a zero or negative amount" in {
      quote("mer_001", 0, Credit) mustBe Left(QuoteError.InvalidAmount)
      quote("mer_001", -5, Credit) mustBe Left(QuoteError.InvalidAmount)
    }
  }

  "Rule 4, what the customer sees is what they pay" should {

    "quote a total that is exactly amount + surcharge" in {
      // pay_01a04f2c2fb87ad9a9b8cd401bd51694 stored 640.4599999999999 and was captured as 64045
      ok("mer_001", 621.81, Credit).total mustBe 640.46
      // pay_01a05da670807be3ae22d4f9d1cd2f63 stored 132.29999999999998
      ok("mer_001", 128.45, Credit).total mustBe 132.30
    }
  }

  "Rule 6, opt-out" should {

    "never surcharge for a merchant with surcharging off, whatever rate is configured" in {
      mustNotSurcharge(ok("mer_005", 100, Credit))
    }
  }

  "An unknown merchant" should {
    "be an error, not an unsurcharged quote" in {
      quote("mer_999", 100, Credit) mustBe Left(QuoteError.UnknownMerchant)
    }
  }
}
