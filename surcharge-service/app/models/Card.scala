package models

import play.api.libs.json._

// bounds are 8 digits, zero padded and inclusive
case class BinRange(start: String, end: String, network: String, cardType: CardType, country: String) {
  def contains(bin: String): Boolean = start <= bin && bin <= end
  def width: Long = end.toLong - start.toLong
}

case class CardInfo(network: String, cardType: CardType, country: String)

object CardInfo {
  val Unknown = CardInfo("UNKNOWN", CardType.Unknown, "")

  implicit val CardInfoWrites: OWrites[CardInfo] = Json.writes[CardInfo]
}
