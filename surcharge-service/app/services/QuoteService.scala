package services

import models.{CardInfo, Quote, QuoteError, QuoteRequest}

import jakarta.inject._
import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success, Try}

@Singleton
class QuoteService @Inject()(merchants: MerchantDirectory, bins: BinTable)(implicit ec: ExecutionContext)
  extends com.typesafe.scalalogging.LazyLogging {

  def quote(request: QuoteRequest): Future[Either[QuoteError, Quote]] = {
    if (request.amount <= 0) {
      Future.successful(Left(QuoteError.InvalidAmount))
    } else {
      merchants.find(request.merchantId).map {
        case None => Left(QuoteError.UnknownMerchant)
        case Some(merchant) if !Money.isWholeMinorUnits(request.amount, merchant.currency) => Left(QuoteError.InvalidAmount)
        case Some(merchant) =>
          val card = cardFor(request.bin)
          val surchargeable = merchant.surchargeEnabled && SurchargeRules.isSurchargeable(card)
          val rate = if (surchargeable) merchant.surchargeRate else 0.0
          val surcharge = if (surchargeable) SurchargeCalculator.surcharge(request.amount, rate, merchant.currency) else 0.0

          Right(Quote(
            merchantId = merchant.merchantId,
            currency = merchant.currency,
            network = card.network,
            cardType = card.cardType,
            surchargeable = surchargeable,
            rate = rate,
            amount = request.amount,
            surcharge = surcharge,
            total = SurchargeCalculator.total(request.amount, surcharge)
          ))
      }
    }
  }

  // if we can't tell the card type, it's unknown and so not surcharged (docs/surcharging.md rule 2). That includes
  // a bin shorter than 8 digits: padding it would guess, and many 6 digit prefixes span more than one card type
  private def cardFor(bin: String): CardInfo = {
    if (bin.count(_.isDigit) < BinTable.BinLength) {
      CardInfo.Unknown
    } else {
      Try(bins.lookup(bin)) match {
        case Success(card) => card.getOrElse(CardInfo.Unknown)
        case Failure(e) =>
          logger.warn(s"bin lookup failed, quoting without a surcharge", e)
          CardInfo.Unknown
      }
    }
  }
}
