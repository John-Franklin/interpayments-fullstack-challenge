name := "surcharge-service"
organization := "com.interpayments"
version := "1.0.0"

scalaVersion := "2.13.18"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

libraryDependencies ++= Seq(
  guice,
  "com.typesafe.scala-logging" %% "scala-logging" % "3.9.6",
  "org.scalatestplus.play" %% "scalatestplus-play" % "7.0.2" % Test
)

scalacOptions ++= Seq("-deprecation", "-feature", "-unchecked", "-Xlint:-unused,_")

// no scaladoc in the staged app
Compile / doc / sources := Seq.empty
Compile / packageDoc / publishArtifact := false
