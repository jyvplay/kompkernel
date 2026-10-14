### Game Version

v1.22.4

### Platform

Windows

### Modded

Vanilla

### SP/MP

Multiplayer

### Description

While trying to play on a private vanilla multiplayer server with my friends, I keep crashing out of the server. There are two types of crashes:
"Soft" crashes, where I am booted out of the server but the Vintage Story client itself continues running, simply returning me to the main menu.
"Hard" crashes, where the Vintage Story client completely crashes, opening the dedicated Crash Reporter window.

I'm really not sure what's causing this issue, but I know it has been a consistent issue for me for over a year now. It has made it impossible for me to join my friends on multiplayer.

### How to reproduce

No clue how to reproduce. Sometimes I crash immediately upon joining the multiplayer server; sometimes I crash after 20+ minutes of uninterrupted gameplay.

### Screenshots

_No response_

### Logs (Required)

**"Soft" crash logs from client-main.log:**
21.7.2026 21:38:19 [Fatal] Caught unhandled exception in thread 'networkproc'. Exiting game.
21.7.2026 21:38:19 [Error] Exception: Unknown wire type: 7 at stream position 108404
   at ProtocolParser.SkipKey(CitoStream stream, Key key) in VintagestoryLib\Common\Network\Packets.Serializer.cs:line 108
   at Packet_ServerChunkSerializer.Deserialize(CitoMemoryStream stream, Packet_ServerChunk instance) in VintagestoryLib\Common\Network\Packets.Serializer.cs:line 24321
   at Packet_ServerChunksSerializer.Deserialize(CitoMemoryStream stream, Packet_ServerChunks instance) in VintagestoryLib\Common\Network\Packets.Serializer.cs:line 24147
   at Packet_ServerChunksSerializer.DeserializeLengthDelimited(CitoMemoryStream stream, Packet_ServerChunks instance) in VintagestoryLib\Common\Network\Packets.Serializer.cs:line 24164
   at Packet_ServerSerializer.Deserialize(CitoMemoryStream stream, Packet_Server instance) in VintagestoryLib\Common\Network\Packets.Serializer.cs:line 17990
   at Vintagestory.Client.NoObf.SystemNetworkProcess.TryReadPacket(Byte[] data, Int32 dataLength) in VintagestoryLib\Client\Systems\NetworkProcess.cs:line 381
   at Vintagestory.Client.NoObf.SystemNetworkProcess.OnSeperateThreadGameTick(Single dt) in VintagestoryLib\Client\Systems\NetworkProcess.cs:line 374
   at Vintagestory.Client.NoObf.ClientThread.Update() in VintagestoryLib\Client\ClientThread.cs:line 98
   at Vintagestory.Client.NoObf.ClientThread.Process() in VintagestoryLib\Client\ClientThread.cs:line 38
21.7.2026 21:38:19 [Notification] Window was resized to 0 0? Window probably got minimized. Will not rebuild frame buffers
21.7.2026 21:38:21 [Notification] Destroying game session, waiting up to 200ms for client threads to exit
21.7.2026 21:38:21 [Notification] Exiting current game to main menu, reason: client thread crash

********************
**"Hard" crash logs from the dedicated Crash Reporter window:**
Running on 64 bit Windows 10.0.19045.0 with 16252 MB RAM
Game Version: v1.22.4 (Stable)
7/21/2026 9:30:23 PM: Critical error occurred
Loaded Mods: game@1.22.4, creative@1.22.4, survival@1.22.4
System.NullReferenceException: Object reference not set to an instance of an object.
   at Vintagestory.Client.NoObf.ClientSystemStartup.HandleServerIdent(Packet_Server packet) in VintagestoryLib\Client\Systems\Startup.cs:line 193
   at Vintagestory.Client.NoObf.ClientMain.ExecuteMainThreadTasks(Single deltaTime) in VintagestoryLib\Client\ClientMain.cs:line 817
   at Vintagestory.Client.NoObf.ClientMain.MainGameLoop(Single deltaTime) in VintagestoryLib\Client\ClientMain.cs:line 783
   at Vintagestory.Client.GuiScreenRunningGame.RenderToPrimary(Single dt) in VintagestoryLib\Client\MainMenu\Screens\GuiScreenRunningGame.cs:line 173
   at Vintagestory.Client.ScreenManager.Render(Single dt) in VintagestoryLib\Client\ScreenManager.cs:line 742
   at Vintagestory.Client.ScreenManager.OnNewFrame(Single dt) in VintagestoryLib\Client\ScreenManager.cs:line 686
   at Vintagestory.Client.NoObf.ClientPlatformWindows.window_RenderFrame(FrameEventArgs e) in VintagestoryLib\Client\ClientPlatform\GameWindow.cs:line 112
   at OpenTK.Windowing.Desktop.GameWindow.Run()
   at Vintagestory.Client.ClientProgram.Start(ClientProgramArgs args, String[] rawArgs) in VintagestoryLib\Client\ClientProgram.cs:line 354
   at Vintagestory.Client.ClientProgram.<>c__DisplayClass10_0.<.ctor>b__1() in VintagestoryLib\Client\ClientProgram.cs:line 131
   at Vintagestory.ClientNative.CrashReporter.Start(ThreadStart start) in VintagestoryLib\Client\ClientPlatform\ClientNative\CrashReporter.cs:line 95

Event Log entries for Vintagestory.exe, the latest 1
==================================
{ TimeGenerated = 7/21/2026 9:30:24 PM, Site = , Source = Application Error, Message = Faulting application name: Vintagestory.exe, version: 1.22.4.0, time stamp: 0x691d0000
Faulting module name: openal32.dll, version: 1.23.0.0, time stamp: 0x63dd31ad
Exception code: 0x40000015
Fault offset: 0x00000000000df046
Faulting process id: 0x38d8
Faulting application start time: 0x01dd19929f318c9c
Faulting application path: C:\Users\Me\AppData\Roaming\Vintagestory\Vintagestory.exe
Faulting module path: C:\Users\Me\AppData\Roaming\Vintagestory\Lib\openal32.dll
Report Id: 3c300d5d-f8f0-4ae8-b375-77acc703746e
Faulting package full name: 
Faulting package-relative application ID:  }

