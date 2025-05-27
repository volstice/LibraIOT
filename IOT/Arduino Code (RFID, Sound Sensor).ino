#include <SPI.h>
#include <MFRC522.h>

// RC522 RFID Module Pins
#define RST_PIN 5
#define SS_PIN 10


MFRC522 rfid(SS_PIN, RST_PIN); // Create an instance of the RC522 class

// Sound Sensor Pin
#define SOUND_SENSOR_PIN A0
#define SOUND_THRESHOLD 120 // Adjust based on sound levels in your library

void setup() {
  // Initialize Serial Monitor
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect. Needed for Leonardo.
  }

  // Initialize RFID Reader
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("RFID Reader Initialized");

  // Initialize Sound Sensor
  pinMode(SOUND_SENSOR_PIN, INPUT);
  Serial.println("Sound Sensor Ready");
}

void loop() {
  // Sound Sensor Monitoring
  // int soundLevel = analogRead(SOUND_SENSOR_PIN); // Read sound level
  // if (soundLevel > SOUND_THRESHOLD) {
  //   Serial.println("Please maintain silence");
  //   delay(1000); // Avoid spamming the message
  // }

  // RFID Scanning
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return; // No card detected
  }

  // Print RFID Tag to Serial Monitor
  Serial.print("RFID Tag: ");
  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    Serial.print(rfid.uid.uidByte[i], HEX);
  }
  Serial.println();
  
  // Halt RFID card
  rfid.PICC_HaltA();
  delay(500); // Delay between scans
}
