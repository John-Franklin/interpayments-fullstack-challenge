package models

import play.api.libs.json._

// surchargeRate is a percent, 3.0 is 3%
case class MerchantConfig(merchantId: String,
                          name: String,
                          currency: String,
                          surchargeRate: Double,
                          surchargeEnabled: Boolean)

object MerchantConfig {
  implicit val MerchantConfigFormat: OFormat[MerchantConfig] = Json.format[MerchantConfig]
}
