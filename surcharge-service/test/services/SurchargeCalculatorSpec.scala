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

    // docs/surcharging.md rule 3. INC-4471: $185.00 at 2.5% is $4.625, which must be $4.63, not $4.62
    "round half up, not half even" in {
      SurchargeCalculator.surcharge(185.00, 2.5) mustBe 4.63
      SurchargeCalculator.surcharge(45.00, 2.5) mustBe 1.13
      SurchargeCalculator.surcharge(1.00, 2.5) mustBe 0.03
    }

    "be zero at a zero rate" in {
      SurchargeCalculator.surcharge(250.00, 0.0) mustBe 0.0
    }
  }
}
