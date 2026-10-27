package services

import models.MerchantConfig
import services.onboarding.OnboardingClient

import jakarta.inject._
import scala.concurrent.{ExecutionContext, Future}

@Singleton
class MerchantDirectory @Inject()(onboarding: OnboardingClient)(implicit ec: ExecutionContext) {

  def find(merchantId: String): Future[Option[MerchantConfig]] = {
    Future(onboarding.fetchMerchant(merchantId))
  }
}
