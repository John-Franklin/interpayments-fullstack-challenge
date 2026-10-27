package models

import play.api.libs.json._

sealed abstract class CardType(val code: String)

object CardType {
  case object Credit extends CardType("CREDIT")
  case object Debit extends CardType("DEBIT")
  case object Prepaid extends CardType("PREPAID")
  case object Unknown extends CardType("UNKNOWN")

  val values: Seq[CardType] = Seq(Credit, Debit, Prepaid, Unknown)

  def parse(code: String): CardType = values.find(_.code.equalsIgnoreCase(code.trim)).getOrElse(Unknown)

  implicit val CardTypeWrites: Writes[CardType] = Writes(t => JsString(t.code))
}
