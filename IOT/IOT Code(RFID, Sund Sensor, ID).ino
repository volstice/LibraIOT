/*
 * Arduino Leonardo RFID Scanner with Unique ID Response
 * 
 * This sketch:
 * 1. Reads RFID tags using RC522 module
 * 2. Responds to "ID" commands with a unique device identifier
 * 3. Monitors sound levels (currently commented out)
 */

#include <SPI.h>
#include <MFRC522.h>
#include <EEPROM.h>

// RC522 RFID Module Pins
#define RST_PIN 5
#define SS_PIN 10

// Sound Sensor Pin (Currently not used)
#define SOUND_SENSOR_PIN A0
#define SOUND_THRESHOLD 120 // Adjust based on sound levels in your library

// Create an instance of the RC522 class
MFRC522 rfid(SS_PIN, RST_PIN);

// Store the generated ID so we don't have to recreate it each time
String uniqueID = "";

void setup() {
  // Initialize Serial Monitor
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect. Needed for Leonardo.
  }
  
  // Generate the unique ID once during setup
  generateUniqueID();
  
  // Print initial identifier information for debugging
  Serial.println("Arduino Leonardo ID Information:");
  Serial.print("Board: Arduino Leonardo");
  Serial.println("USB VID/PID: 0x2341/0x8036");
  Serial.print("Unique ID: ");
  Serial.println(uniqueID);
  Serial.print("Processor: ATmega32U4 (Signature: 0x");
  Serial.print(boot_signature_byte_get(0), HEX);
  Serial.print(boot_signature_byte_get(2), HEX);
  Serial.print(boot_signature_byte_get(4), HEX);
  Serial.println(")");

  // Initialize RFID Reader
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("RFID Reader Initialized");

  // Initialize Sound Sensor
  pinMode(SOUND_SENSOR_PIN, INPUT);
  Serial.println("Sound Sensor Ready");
  
  Serial.println("System Ready! Waiting for RFID cards or ID commands...");
}

void loop() {
  // Check for incoming serial commands
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    // Process the ID command
    if (command == "ID") {
      Serial.print("Unique ID: ");
      Serial.println(uniqueID);
    }
  }

  // Sound Sensor Monitoring (currently disabled)
  // Uncomment below to enable sound monitoring
  /*
  int soundLevel = analogRead(SOUND_SENSOR_PIN);
  if (soundLevel > SOUND_THRESHOLD) {
    Serial.println("Please maintain silence");
    delay(1000); // Avoid spamming the message
  }
  */

  // RFID Scanning
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
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
}

// Read signature byte from the microcontroller
uint8_t boot_signature_byte_get(uint16_t addr) {
  uint8_t result;
  asm volatile(
    "lpm %0, Z" "\n\t"
    : "=r" (result)
    : "z" (addr)
  );
  return result;
}

// Generate a unique ID based on EEPROM values
void generateUniqueID() {
  // Use a combination of chip signature and EEPROM values to create a unique ID
  uint32_t id1 = 0;
  
  // Read the chip signature
  id1 += (uint32_t)boot_signature_byte_get(0) << 24;
  id1 += (uint32_t)boot_signature_byte_get(2) << 16;
  id1 += (uint32_t)boot_signature_byte_get(4) << 8;
  
  // Mix in some EEPROM values
  for (int i = 0; i < 8; i++) {
    id1 ^= ((uint32_t)EEPROM.read(i) << (i % 4) * 8);
  }
  
  // Generate a second part of the ID
  uint32_t id2 = 0;
  for (int i = 8; i < 16; i++) {
    id2 ^= ((uint32_t)EEPROM.read(i) << (i % 4) * 8);
  }
  
  // Format the unique ID string
  char idStr[20];
  sprintf(idStr, "%08lX-%08lX", id1, id2);
  uniqueID = String(idStr);
}