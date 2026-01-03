# Set volume for a specific app using Windows Audio Session API
param(
    [string]$AppName = "chrome",
    [int]$Volume = 20
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface ISimpleAudioVolume {
    int SetMasterVolume(float fLevel, ref Guid EventContext);
    int GetMasterVolume(out float pfLevel);
    int SetMute(bool bMute, ref Guid EventContext);
    int GetMute(out bool pbMute);
}

[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionManager2 {
    int NotImpl1();
    int NotImpl2();
    int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
}

[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionEnumerator {
    int GetCount(out int SessionCount);
    int GetSession(int SessionCount, out IAudioSessionControl Session);
}

[Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionControl {
    int NotImpl1();
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, [MarshalAs(UnmanagedType.LPStruct)] Guid EventContext);
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, [MarshalAs(UnmanagedType.LPStruct)] Guid EventContext);
    int GetGroupingParam(out Guid pRetVal);
    int SetGroupingParam([MarshalAs(UnmanagedType.LPStruct)] Guid Override, [MarshalAs(UnmanagedType.LPStruct)] Guid EventContext);
    int NotImpl2();
    int NotImpl3();
}

[Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionControl2 : IAudioSessionControl {
    int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int GetProcessId(out int pRetVal);
    int IsSystemSoundsSession();
    int SetDuckingPreference(bool optOut);
}

[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumerator { }

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

public class AudioManager {
    public static void SetAppVolume(string appName, float volume) {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
        IMMDevice device;
        enumerator.GetDefaultAudioEndpoint(0, 1, out device);

        Guid IID_IAudioSessionManager2 = typeof(IAudioSessionManager2).GUID;
        object o;
        device.Activate(ref IID_IAudioSessionManager2, 0, IntPtr.Zero, out o);
        var mgr = (IAudioSessionManager2)o;

        IAudioSessionEnumerator sessionEnumerator;
        mgr.GetSessionEnumerator(out sessionEnumerator);

        int count;
        sessionEnumerator.GetCount(out count);

        for (int i = 0; i < count; i++) {
            IAudioSessionControl ctl;
            sessionEnumerator.GetSession(i, out ctl);

            var ctl2 = (IAudioSessionControl2)ctl;
            int pid;
            ctl2.GetProcessId(out pid);

            try {
                var proc = System.Diagnostics.Process.GetProcessById(pid);
                if (proc.ProcessName.ToLower().Contains(appName.ToLower())) {
                    var vol = (ISimpleAudioVolume)ctl;
                    Guid guid = Guid.Empty;
                    vol.SetMasterVolume(volume, ref guid);
                    Console.WriteLine("Set " + proc.ProcessName + " (PID " + pid + ") to " + (volume * 100) + "%");
                }
            } catch { }
        }
    }
}
"@

$volumeFloat = $Volume / 100.0
[AudioManager]::SetAppVolume($AppName, $volumeFloat)
