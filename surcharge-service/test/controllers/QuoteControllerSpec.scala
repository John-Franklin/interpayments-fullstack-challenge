package controllers

import org.scalatestplus.play._
import org.scalatestplus.play.guice._
import play.api.libs.json._
import play.api.test.Helpers._
import play.api.test._

class QuoteControllerSpec extends PlaySpec
  with GuiceOneAppPerSuite {

  val QuoteEndpoint = "/v1/quotes"

  def quote(body: JsValue) = route(app, FakeRequest(POST, QuoteEndpoint).withJsonBody(body)).get

  "POST /v1/quotes" should {

    "surcharge a credit card at the merchant's rate" in {
      val result = quote(Json.obj("merchantId" -> "mer_001", "amount" -> 100.00, "bin" -> "41111111"))

      status(result) mustBe OK
      val json = contentAsJson(result)
      (json \ "network").as[String] mustBe "VISA"
      (json \ "cardType").as[String] mustBe "CREDIT"
      (json \ "surchargeable").as[Boolean] mustBe true
      (json \ "surcharge").as[Double] mustBe 3.00
      (json \ "total").as[Double] mustBe 103.00
    }

    "not surcharge a debit card" in {
      val result = quote(Json.obj("merchantId" -> "mer_001", "amount" -> 100.00, "bin" -> "40000566"))

      status(result) mustBe OK
      val json = contentAsJson(result)
      (json \ "cardType").as[String] mustBe "DEBIT"
      (json \ "surchargeable").as[Boolean] mustBe false
      (json \ "surcharge").as[Double] mustBe 0.0
      (json \ "total").as[Double] mustBe 100.00
    }

    "not surcharge when the merchant has surcharging off" in {
      val result = quote(Json.obj("merchantId" -> "mer_004", "amount" -> 40.00, "bin" -> "41111111"))
      status(result) mustBe OK
      (contentAsJson(result) \ "surcharge").as[Double] mustBe 0.0
    }

    "return a 404 for an unknown merchant" in {
      val result = quote(Json.obj("merchantId" -> "mer_999", "amount" -> 10.00, "bin" -> "41111111"))
      status(result) mustBe NOT_FOUND
    }

    "reject a zero amount" in {
      val result = quote(Json.obj("merchantId" -> "mer_001", "amount" -> 0, "bin" -> "41111111"))
      status(result) mustBe UNPROCESSABLE_ENTITY
    }

    "reject a body missing fields" in {
      val result = quote(Json.obj("merchantId" -> "mer_001"))
      status(result) mustBe BAD_REQUEST
    }
  }

  "GET /v1/bins/:bin" should {

    "describe a known bin" in {
      val result = route(app, FakeRequest(GET, "/v1/bins/55555555")).get
      status(result) mustBe OK
      (contentAsJson(result) \ "network").as[String] mustBe "MASTERCARD"
    }

    "return a 404 for a bin that isn't in the table" in {
      val result = route(app, FakeRequest(GET, "/v1/bins/63900000")).get
      status(result) mustBe NOT_FOUND
    }
  }
}
