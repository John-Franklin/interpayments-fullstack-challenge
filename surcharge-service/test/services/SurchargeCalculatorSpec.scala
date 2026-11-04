package services

import org.scalatestplus.play.PlaySpec

class SurchargeCalculatorSpec extends PlaySpec {

  "SurchargeCalculator.surcharge" should {

    "apply the rate as a percent" in {
      SurchargeCalculator.surcharge(100.00, 3.0, "USD") mustBe 3.00
      SurchargeCalculator.surcharge(80.00, 2.5, "USD") mustBe 2.00
    }

    "round to the cent" in {
      SurchargeCalculator.surcharge(12.34, 3.0, "USD") mustBe 0.37
      SurchargeCalculator.surcharge(49.99, 2.5, "USD") mustBe 1.25
      SurchargeCalculator.surcharge(19.99, 3.0, "USD") mustBe 0.60
    }

    // docs/surcharging.md rule 3. INC-4471: $185.00 at 2.5% is $4.625, which must be $4.63, not $4.62
    "round half up, not half even" in {
      SurchargeCalculator.surcharge(185.00, 2.5, "USD") mustBe 4.63
      SurchargeCalculator.surcharge(45.00, 2.5, "USD") mustBe 1.13
      SurchargeCalculator.surcharge(1.00, 2.5, "USD") mustBe 0.03
      // pay_01a049a744b073ff8cdeb13ebde11f4b was charged 3.34 for 111.50 at 3%
      SurchargeCalculator.surcharge(111.50, 3.0, "USD") mustBe 3.35
    }

    // docs/surcharging.md rule 3: whole yen for JPY. Sakura Imports' seed payments carry fractional yen
    "round to the whole yen" in {
      // pay_01a04daf098074f1bd48244282b7a479 was charged ¥1,425.45
      SurchargeCalculator.surcharge(47515, 3.0, "JPY") mustBe 1425
      // pay_01a0627f3d0877dd83c1da0aa86f06da was charged ¥1,522.50, half up is ¥1,523
      SurchargeCalculator.surcharge(50750, 3.0, "JPY") mustBe 1523
      // pay_01a0678cdd0072ed91d2b49286dcf2b1 was already whole yen
      SurchargeCalculator.surcharge(61200, 3.0, "JPY") mustBe 1836
    }

    "be zero at a zero rate" in {
      SurchargeCalculator.surcharge(250.00, 0.0, "USD") mustBe 0.0
    }
  }

  // docs/surcharging.md rule 4: the total has to be exactly amount + surcharge so it can be charged as shown
  "SurchargeCalculator.total" should {

    "add in decimal, without binary floating point noise" in {
      // pay_01a04f2c2fb87ad9a9b8cd401bd51694 stored 640.4599999999999
      SurchargeCalculator.total(621.81, 18.65) mustBe 640.46
      // pay_01a05da670807be3ae22d4f9d1cd2f63 stored 132.29999999999998
      SurchargeCalculator.total(128.45, 3.85) mustBe 132.30
      SurchargeCalculator.total(0.1, 0.2) mustBe 0.3
    }
  }

  "Money" should {

    "know each currency's smallest unit" in {
      Money.scale("USD") mustBe 2
      Money.scale("JPY") mustBe 0
    }

    "reject amounts finer than the currency's smallest unit" in {
      Money.isWholeMinorUnits(10.05, "USD") mustBe true
      Money.isWholeMinorUnits(100, "USD") mustBe true
      Money.isWholeMinorUnits(10.005, "USD") mustBe false
      Money.isWholeMinorUnits(17415, "JPY") mustBe true
      Money.isWholeMinorUnits(100.5, "JPY") mustBe false
    }
  }
}
