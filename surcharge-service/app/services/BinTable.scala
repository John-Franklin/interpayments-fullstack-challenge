package services

import models.{BinRange, CardInfo, CardType}
import play.api.{Configuration, Environment}

import java.util.zip.GZIPInputStream
import jakarta.inject._
import scala.io.Source

class BinTable(ranges: IndexedSeq[BinRange]) {

  def size: Int = ranges.size

  // only the first 8 digits matter.  issuers carve narrower product ranges out of broader
  // ones so ranges can overlap, the narrowest match wins
  def lookup(bin: String): Option[CardInfo] = {
    val b = BinTable.normalize(bin)
    ranges.filter(_.contains(b))
      .sortBy(_.width)
      .headOption
      .map(r => CardInfo(r.network, r.cardType, r.country))
  }
}

object BinTable {
  val BinLength = 8

  def normalize(input: String): String = input.filter(_.isDigit).take(BinLength).padTo(BinLength, '0')

  // range_start,range_end,network,card_type,country with a header row
  def parse(lines: Iterator[String]): Vector[BinRange] = {
    lines.drop(1)
      .filter(_.nonEmpty)
      .map(line => {
        val cols = line.split(',')
        BinRange(cols(0), cols(1), cols(2), CardType.parse(cols(3)), cols(4))
      })
      .toVector
  }
}

@Singleton
class BinTableProvider @Inject()(env: Environment, config: Configuration)
  extends com.google.inject.Provider[BinTable] with com.typesafe.scalalogging.LazyLogging {

  override def get(): BinTable = {
    val resource = config.get[String]("surcharge.bins.resource")
    val stream = env.resourceAsStream(resource)
      .getOrElse(throw new IllegalStateException(s"bin table $resource not found on the classpath"))

    val source = Source.fromInputStream(new GZIPInputStream(stream), "UTF-8")
    try {
      val table = new BinTable(BinTable.parse(source.getLines()))
      logger.info(s"loaded ${table.size} bin ranges from $resource")
      table
    } finally {
      source.close()
    }
  }
}
