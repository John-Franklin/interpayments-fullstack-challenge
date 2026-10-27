package controllers

import play.api.libs.json._
import play.api.mvc._
import services.BinTable

import jakarta.inject._

@Singleton
class HealthController @Inject()(cc: ControllerComponents, bins: BinTable) extends AbstractController(cc) {

  def health(): Action[AnyContent] = Action {
    Ok(Json.obj("status" -> "ok", "binRanges" -> bins.size))
  }
}
