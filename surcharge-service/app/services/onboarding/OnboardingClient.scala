package services.onboarding

import models.MerchantConfig
import play.api.libs.json.Json
import play.api.{Configuration, Environment}

import java.util.concurrent.ThreadLocalRandom
import jakarta.inject._

/**
  * Client for the onboarding service's merchant api.  This is synchronous and blocks the calling
  * thread, usually for 5-15ms.  Locally it serves conf/merchants.json with the same latency.
  */
@Singleton
class OnboardingClient @Inject()(env: Environment, config: Configuration) {

  private val merchants: Map[String, MerchantConfig] = {
    val resource = config.get[String]("surcharge.merchants.resource")
    val stream = env.resourceAsStream(resource)
      .getOrElse(throw new IllegalStateException(s"merchant fixture $resource not found on the classpath"))
    try {
      Json.parse(stream).as[Seq[MerchantConfig]].map(m => m.merchantId -> m).toMap
    } finally {
      stream.close()
    }
  }

  def fetchMerchant(merchantId: String): Option[MerchantConfig] = {
    Thread.sleep(ThreadLocalRandom.current().nextLong(5, 16))
    merchants.get(merchantId)
  }
}
