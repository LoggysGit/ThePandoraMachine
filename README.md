# The Pandora Machine - Open Source AI Bartender Bot
The Pandora Machine is an automated, AI-driven mixology system capable of generating and dispensing customized drinks using a combination of base liquids and 24 high-precision flavor concentrates.

## Stack
**Web App**: HTML5, CSS3, JavaScript

**AI & Speech Engine**: Groq API (Whisper-large-v3-turbo) + LLM recipe generator

**Firmware & Hardware**: C++ PlatformIO for ESP32

## Key Features & Aspects
AI Flavor Generator: Translates natural language voice commands into unique flavors.

28-Channel Liquid Control: 24 micro-peristaltic pumps for flavors + 4 high-flow pumps for base liquids.

Web Bluetooth (BLE): Low-latency wireless connection directly from any modern web browser without installing native apps.

Visual Feedback: Addressable WS2812B LED status animations during the mixing process.

## Set up the project
1. Assemble the machine (instructions)[]
2. Upload a firmware in ESP32 (guide)[]
3. Go to https://loggysgit.github.io/ThePandoraMachine/
4. Enter your Qroq API key (guide)[]

All done!

## Ingredients & Solution Preparation
To ensure consistent flow rates and proper taste balance, prepare your solutions using the following standard formulas:

### Sweet solution  
* Yield: ~1 Liter (1:1)
* Recipe: 620 g White Sugar + 620 ml Warm Tap Water
* Instructions: Stir until completely dissolved and clear.

### Sour solution
* Yield: ~1 Liter
* Recipe: 100 g Citric Acid Powder + 1,000 ml Warm Tap Water
* Instructions: Dissolve completely and let cool to room temperature.

### Flavor solution
* Base PG Solution (1:1): 
   * 50 ml Propylene Glycol (PG 99.9%) + 50 ml Distilled Water (T = 40–50C).
* Recipe: Add ~1 ml of PG-basedFlavor Essence per 10 ml of PG Solution Base.

### Soda water
* Plain soda water (without any taste and flavor).

### Still water
* Clean, filtered still water at room temperature.

## Scheme & BOM
> image
> link to BOM

## Future of the project
> Mindmap

Project was made by Loggys, 2026