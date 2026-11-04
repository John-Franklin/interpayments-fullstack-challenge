package services

import models.{CardInfo, CardType}
import org.scalatestplus.play.PlaySpec

class SurchargeRulesSpec extends PlaySpec {

  def card(cardType: CardType) = CardInfo("VISA", cardType, "US")

  // docs/surcharging.md rules 1 and 2
  "SurchargeRules.isSurchargeable" should {

    "allow a credit card" in {
      SurchargeRules.isSurchargeable(card(CardType.Credit)) mustBe true
    }

    "never allow a debit card" in {
      SurchargeRules.isSurchargeable(card(CardType.Debit)) mustBe false
    }

    "never allow a prepaid card" in {
      SurchargeRules.isSurchargeable(card(CardType.Prepaid)) mustBe false
    }

    "not allow a card whose type we can't tell" in {
      SurchargeRules.isSurchargeable(card(CardType.Unknown)) mustBe false
      SurchargeRules.isSurchargeable(CardInfo.Unknown) mustBe false
    }
  }
}
