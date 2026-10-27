package services

import models.{CardInfo, Quote, QuoteError, QuoteRequest}

import jakarta.inject._
import scala.concurrent.{ExecutionContext, Future}

@Singleton
class QuoteService @Inject()(merchants: MerchantDirectory, bins: BinTable)(implicit ec: ExecutionContext) {

  def quote(request: QuoteRequest): Future[Either[QuoteError, Quote]] = {
    if (request.amount <= 0) {
      Future.successful(Left(QuoteError.InvalidAmount))
    } else {
      merchants.find(request.merchantId).map {
        case None => Left(QuoteError.UnknownMerchant)
        case Some(merchant) =>
          val card = bins.lookup(request.bin).getOrElse(CardInfo.Unknown)
          val surchargeable = merchant.surchargeEnabled && SurchargeRules.isSurchargeable(card)
          val rate = if (surchargeable) merchant.surchargeRate else 0.0
          val surcharge = if (surchargeable) SurchargeCalculator.surcharge(request.amount, rate) else 0.0

          Right(Quote(
            merchantId = merchant.merchantId,
            currency = merchant.currency,
            network = card.network,
            cardType = card.cardType,
            surchargeable = surchargeable,
            rate = rate,
            amount = request.amount,
            surcharge = surcharge,
            total = request.amount + surcharge
          ))
      }
    }
  }
}
