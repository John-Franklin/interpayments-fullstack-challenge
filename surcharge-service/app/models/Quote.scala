package models

import play.api.libs.json._

case class QuoteRequest(merchantId: String, amount: Double, bin: String)

object QuoteRequest {
  implicit val QuoteRequestReads: Reads[QuoteRequest] = Json.reads[QuoteRequest]
}

case class Quote(merchantId: String,
                 currency: String,
                 network: String,
                 cardType: CardType,
                 surchargeable: Boolean,
                 rate: Double,
                 amount: Double,
                 surcharge: Double,
                 total: Double)

object Quote {
  implicit val QuoteWrites: OWrites[Quote] = Json.writes[Quote]
}

sealed trait QuoteError
object QuoteError {
  case object UnknownMerchant extends QuoteError
  case object InvalidAmount extends QuoteError
}
