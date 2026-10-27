import com.google.inject.AbstractModule
import services.{BinTable, BinTableProvider}

class Module extends AbstractModule {

  override def configure() = {
    // load the bin table at startup rather than on the first quote
    bind(classOf[BinTable]).toProvider(classOf[BinTableProvider]).asEagerSingleton()
  }
}
