/*
 * Arduino Leonardo ID Reader
 * 
 * This sketch reads the unique serial number from an Arduino Leonardo
 * and prints it to the Serial Monitor.
 */

#include <EEPROM.h>

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect. Needed for Leonardo only
  }
  
  // Print a header
  Serial.println("Arduino Leonardo ID Information:");
  
  // Print the board name
  Serial.print("Board: ");
  Serial.println("Arduino Leonardo");
  
  // Print the USB VID/PID
  Serial.println("USB VID/PID: 0x2341/0x8036");
  
  // Generate a unique identifier based on the MAC address
  Serial.print("Unique ID: ");
  printUniqueID();
  
  // Print the processor signature
  Serial.print("Processor: ATmega32U4 (Signature: 0x");
  Serial.print(boot_signature_byte_get(0), HEX);
  Serial.print(boot_signature_byte_get(2), HEX);
  Serial.print(boot_signature_byte_get(4), HEX);
  Serial.println(")");
}

void loop() {
  // Nothing to do here
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

// Generate and print a unique ID based on EEPROM values
void printUniqueID() {
  // Use a combination of chip signature and EEPROM values to create a unique ID
  uint32_t id = 0;
  
  // Read the chip signature
  id += (uint32_t)boot_signature_byte_get(0) << 24;
  id += (uint32_t)boot_signature_byte_get(2) << 16;
  id += (uint32_t)boot_signature_byte_get(4) << 8;
  
  // Mix in some EEPROM values
  for (int i = 0; i < 8; i++) {
    id ^= ((uint32_t)EEPROM.read(i) << (i % 4) * 8);
  }
  
  // Print the unique ID in hexadecimal
  char idStr[12];
  sprintf(idStr, "%08lX", id);
  Serial.print(idStr);
  Serial.print("-");
  
  // Generate a second part of the ID
  id = 0;
  for (int i = 8; i < 16; i++) {
    id ^= ((uint32_t)EEPROM.read(i) << (i % 4) * 8);
  }
  
  sprintf(idStr, "%08lX", id);
  Serial.println(idStr);
}