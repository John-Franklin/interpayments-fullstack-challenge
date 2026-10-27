package services

import models.{BinRange, CardType}
import org.scalatestplus.play.PlaySpec

class BinTableSpec extends PlaySpec {

  val table = new BinTable(Vector(
    BinRange("40000000", "40009999", "VISA", CardType.Credit, "US"),
    BinRange("40000500", "40000599", "VISA", CardType.Debit, "US"),
    BinRange("40000550", "40000559", "VISA", CardType.Prepaid, "US"),
    BinRange("55555500", "55555599", "MASTERCARD", CardType.Credit, "US")
  ))

  "BinTable.lookup" should {

    "use the first 8 digits of a card number" in {
      table.lookup("5555555555554444").map(_.network) mustBe Some("MASTERCARD")
    }

    "ignore spaces and dashes" in {
      table.lookup("5555 5555-5555 4444").map(_.network) mustBe Some("MASTERCARD")
    }

    "pick the narrowest of overlapping ranges" in {
      table.lookup("4000000000000002").map(_.cardType) mustBe Some(CardType.Credit)
      table.lookup("4000056655665556").map(_.cardType) mustBe Some(CardType.Debit)
      table.lookup("4000055500000000").map(_.cardType) mustBe Some(CardType.Prepaid)
    }

    "include both ends of a range" in {
      table.lookup("40000599").map(_.cardType) mustBe Some(CardType.Debit)
      table.lookup("40000600").map(_.cardType) mustBe Some(CardType.Credit)
    }

    "pad a 6 digit bin to 8" in {
      table.lookup("555555").map(_.network) mustBe Some("MASTERCARD")
    }

    "return None when no range matches" in {
      table.lookup("6390000000000005") mustBe None
    }
  }
}
