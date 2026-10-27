package services

import org.scalatestplus.play.PlaySpec

class SurchargeCalculatorSpec extends PlaySpec {

  "SurchargeCalculator.surcharge" should {

    "apply the rate as a percent" in {
      SurchargeCalculator.surcharge(100.00, 3.0) mustBe 3.00
      SurchargeCalculator.surcharge(80.00, 2.5) mustBe 2.00
    }

    "round to the cent" in {
      SurchargeCalculator.surcharge(12.34, 3.0) mustBe 0.37
      SurchargeCalculator.surcharge(49.99, 2.5) mustBe 1.25
      SurchargeCalculator.surcharge(19.99, 3.0) mustBe 0.60
    }

    "be zero at a zero rate" in {
      SurchargeCalculator.surcharge(250.00, 0.0) mustBe 0.0
    }
  }
}
