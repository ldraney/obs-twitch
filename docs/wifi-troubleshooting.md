# WiFi Troubleshooting for Streaming

This guide documents WiFi issues that can cause dropped frames and low bitrate during streaming, and how to diagnose and fix them.

## Quick Fix (CLI Commands)

```bash
# Check current WiFi band
npm run obs wifi -- -c

# Force reconnect to 5 GHz
npm run obs wifi

# Start stream with WiFi pre-check (RECOMMENDED)
npm run obs go
```

The `go` command automatically checks WiFi band and fixes it before starting the stream.

## Symptoms

- High dropped frame percentage (>5%)
- Bitrate well below target (e.g., 3500 kbps when targeting 6000 kbps)
- Inconsistent stream quality
- Stream disconnections

## Quick Diagnosis

```bash
# Check current WiFi band and signal
netsh wlan show interfaces

# Test latency to router (should be <5ms)
ping -n 5 10.0.0.1

# Check stream health
npm run obs status
```

### Key Metrics to Check

| Metric | Good | Bad |
|--------|------|-----|
| Band | 5 GHz | 2.4 GHz |
| Signal | >70% | <50% |
| Router latency | <5ms | >20ms |
| Channel utilization | <30% | >50% |

## Root Cause: 2.4 GHz vs 5 GHz

### Why 2.4 GHz is Bad for Streaming

- **Congested**: Everyone uses it (neighbors, IoT devices, microwaves)
- **Slower**: Max theoretical speed much lower than 5 GHz
- **Higher latency**: More interference = more retransmissions
- **Channel overlap**: Only 3 non-overlapping channels (1, 6, 11)

### Why 5 GHz is Better

- **Less congested**: Fewer devices, more channels
- **Faster**: 802.11ac/ax support higher speeds
- **Lower latency**: Cleaner signal = fewer retransmissions
- **More channels**: 20+ non-overlapping channels

## Solution 1: Force 5 GHz via WiFi Profile

The most reliable fix is to create a WiFi profile that only connects to 5 GHz.

### Step 1: Export Current Profile

```bash
netsh wlan export profile name="YOUR_NETWORK" folder="C:\temp" key=clear
```

### Step 2: Edit the XML File

Add the `<connectivity>` section with 5 GHz-only PHY types:

```xml
<MSM>
    <connectivity>
        <phyType>a</phyType>
        <phyType>ac</phyType>
    </connectivity>
    <security>
        <!-- existing security settings -->
    </security>
</MSM>
```

PHY Types:
- `a` = 802.11a (5 GHz)
- `ac` = 802.11ac (5 GHz)
- `g` = 802.11g (2.4 GHz only)
- `n` = 802.11n (both bands)

### Step 3: Import the Modified Profile

```bash
netsh wlan delete profile name="YOUR_NETWORK"
netsh wlan add profile filename="C:\temp\Wi-Fi-YOUR_NETWORK.xml"
netsh wlan connect name="YOUR_NETWORK"
```

### Step 4: Verify

```bash
netsh wlan show interfaces | findstr "Band"
# Should show: Band: 5 GHz
```

**Important**: Delete the XML file after importing - it contains your WiFi password in plain text!

## Solution 2: Adapter Settings (Less Reliable)

You can set adapter preferences via PowerShell (requires admin):

```powershell
# Set preferred band to 5 GHz
Set-NetAdapterAdvancedProperty -Name 'Wi-Fi' -RegistryKeyword 'RoamingPreferredBandType' -RegistryValue 2

# Set roaming aggressiveness to lowest (prevents band switching)
Set-NetAdapterAdvancedProperty -Name 'Wi-Fi' -RegistryKeyword 'RoamAggressiveness' -RegistryValue 0
```

### Valid Values

**Preferred Band (RoamingPreferredBandType)**:
| Value | Meaning |
|-------|---------|
| 0 | No preference |
| 1 | Prefer 2.4 GHz |
| 2 | Prefer 5 GHz |

**Roaming Aggressiveness (RoamAggressiveness)**:
| Value | Meaning |
|-------|---------|
| 0 | Lowest |
| 1 | Medium-low |
| 2 | Medium |
| 3 | Medium-high |
| 4 | Highest |

**Note**: "Prefer" doesn't force - Windows may still pick 2.4 GHz if it has stronger signal. Use Solution 1 for guaranteed 5 GHz.

## Solution 3: USB Tethering (Backup)

If your phone gets better WiFi than your PC, use USB tethering:

### iPhone
1. Connect iPhone via USB
2. Settings > Personal Hotspot > Allow Others to Join
3. Windows will create a new network adapter automatically

### Android
1. Connect phone via USB
2. Settings > Network > Hotspot & Tethering > USB Tethering

**Note**: Uses phone's data plan unless phone is on WiFi.

## Diagnostic Commands Reference

```bash
# Full WiFi interface details
netsh wlan show interfaces

# Available networks with signal strength and bands
netsh wlan show networks mode=bssid

# WiFi driver information
netsh wlan show drivers

# Current adapter settings
powershell -NoProfile -Command "Get-NetAdapterAdvancedProperty -Name 'Wi-Fi'"

# Test route to Twitch
tracert -d ingest.global.twitch.tv

# Check for VPN interference
netsh interface show interface
```

## Typical Before/After Results

| Metric | 2.4 GHz | 5 GHz |
|--------|---------|-------|
| Bitrate | 1,500-3,500 kbps | 6,000+ kbps |
| Dropped frames | 50-80% | 0% |
| Router latency | 50-200+ ms | 1-5 ms |
| Signal | 30-45% | 80-99% |

## Prevention

1. **Always use 5 GHz** for streaming if available
2. **Use ethernet** when possible (best option)
3. **Position near router** if using WiFi
4. **Avoid 2.4 GHz channel 6** - most congested
5. **Check signal before streaming**: `netsh wlan show interfaces`
