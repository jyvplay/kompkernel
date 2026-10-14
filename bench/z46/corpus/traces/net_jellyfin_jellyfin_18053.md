### Description of the bug

just browsing and I see this leading to crash instance

```
2026-09-15T04:50:47.724259676Z [04:50:47] [INF] [16] Emby.Server.Implementations.IO.LibraryMonitor: movies (/data/movies) will be refreshed.
2026-09-15T04:51:10.004644427Z [04:51:10] [INF] [30] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 closed
2026-09-15T04:51:10.383063392Z [04:51:10] [INF] [37] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 request
2026-09-15T04:51:19.384132000Z [04:51:19] [INF] [36] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 closed
2026-09-15T04:51:19.384435578Z [04:51:19] [INF] [11] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 closed
2026-09-15T04:51:19.389017613Z [04:51:19] [FTL] [11] Main: Unhandled Exception
2026-09-15T04:51:19.389050209Z System.ObjectDisposedException: Cannot access a disposed object.
2026-09-15T04:51:19.389053504Z Object name: 'Emby.Server.Implementations.Session.WebSocketController'.
2026-09-15T04:51:19.389055841Z    at Emby.Server.Implementations.Session.WebSocketController.OnConnectionClosed(Object sender, EventArgs e)
2026-09-15T04:51:19.389058111Z    at System.Threading.Tasks.Task.<>c.<ThrowAsync>b__124_1(Object state)
2026-09-15T04:51:19.389060505Z    at System.Threading.QueueUserWorkItemCallback.Execute()
2026-09-15T04:51:19.389062598Z    at System.Threading.ThreadPoolWorkQueue.Dispatch()
2026-09-15T04:51:19.389064654Z    at System.Threading.PortableThreadPool.WorkerThread.WorkerThreadStart()
2026-09-15T04:51:19.389066750Z    at System.Threading.Thread.StartCallback()
2026-09-15T04:51:19.389327785Z Unhandled exception. System.ObjectDisposedException: Cannot access a disposed object.
2026-09-15T04:51:19.389348699Z Object name: 'Emby.Server.Implementations.Session.WebSocketController'.
2026-09-15T04:51:19.389352311Z    at Emby.Server.Implementations.Session.WebSocketController.OnConnectionClosed(Object sender, EventArgs e)
2026-09-15T04:51:19.389354656Z    at System.Threading.Tasks.Task.<>c.<ThrowAsync>b__124_1(Object state)
2026-09-15T04:51:19.389357177Z    at System.Threading.QueueUserWorkItemCallback.Execute()
2026-09-15T04:51:19.389359574Z    at System.Threading.ThreadPoolWorkQueue.Dispatch()
2026-09-15T04:51:19.389361706Z    at System.Threading.PortableThreadPool.WorkerThread.WorkerThreadStart()
2026-09-15T04:51:19.389363841Z    at System.Threading.Thread.StartCallback()
```

### Reproduction steps

I don't have the exact details

### What is the current _bug_ behavior?

instance crashes and restart

### What is the expected _correct_ behavior?

don't crash

### Jellyfin Server version

12.0

### Specify commit id

_No response_

### Specify unstable release number

_No response_

### Specify version number

_No response_

### Specify the build version

12.0

### Environment

```markdown
- OS: Debian 13
- Linux Kernel:
- Virtualization: no
- Clients: browser
- Browser:
- FFmpeg Version:
- Playback Method:
- Hardware Acceleration:
- CPU Model:
- GPU Model:
- Plugins:
- Reverse Proxy:
- Base URL:
- Networking:
- Jellyfin Data Storage & Filesystem:
- Media Storage & Filesystem:
- External Integrations:
```

### Jellyfin logs

```shell
2026-09-15T04:50:47.724259676Z [04:50:47] [INF] [16] Emby.Server.Implementations.IO.LibraryMonitor: movies (/data/movies) will be refreshed.
2026-09-15T04:51:10.004644427Z [04:51:10] [INF] [30] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 closed
2026-09-15T04:51:10.383063392Z [04:51:10] [INF] [37] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 request
2026-09-15T04:51:19.384132000Z [04:51:19] [INF] [36] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 closed
2026-09-15T04:51:19.384435578Z [04:51:19] [INF] [11] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 closed
2026-09-15T04:51:19.389017613Z [04:51:19] [FTL] [11] Main: Unhandled Exception
2026-09-15T04:51:19.389050209Z System.ObjectDisposedException: Cannot access a disposed object.
2026-09-15T04:51:19.389053504Z Object name: 'Emby.Server.Implementations.Session.WebSocketController'.
2026-09-15T04:51:19.389055841Z    at Emby.Server.Implementations.Session.WebSocketController.OnConnectionClosed(Object sender, EventArgs e)
2026-09-15T04:51:19.389058111Z    at System.Threading.Tasks.Task.<>c.<ThrowAsync>b__124_1(Object state)
2026-09-15T04:51:19.389060505Z    at System.Threading.QueueUserWorkItemCallback.Execute()
2026-09-15T04:51:19.389062598Z    at System.Threading.ThreadPoolWorkQueue.Dispatch()
2026-09-15T04:51:19.389064654Z    at System.Threading.PortableThreadPool.WorkerThread.WorkerThreadStart()
2026-09-15T04:51:19.389066750Z    at System.Threading.Thread.StartCallback()
2026-09-15T04:51:19.389327785Z Unhandled exception. System.ObjectDisposedException: Cannot access a disposed object.
2026-09-15T04:51:19.389348699Z Object name: 'Emby.Server.Implementations.Session.WebSocketController'.
2026-09-15T04:51:19.389352311Z    at Emby.Server.Implementations.Session.WebSocketController.OnConnectionClosed(Object sender, EventArgs e)
2026-09-15T04:51:19.389354656Z    at System.Threading.Tasks.Task.<>c.<ThrowAsync>b__124_1(Object state)
2026-09-15T04:51:19.389357177Z    at System.Threading.QueueUserWorkItemCallback.Execute()
2026-09-15T04:51:19.389359574Z    at System.Threading.ThreadPoolWorkQueue.Dispatch()
2026-09-15T04:51:19.389361706Z    at System.Threading.PortableThreadPool.WorkerThread.WorkerThreadStart()
2026-09-15T04:51:19.389363841Z    at System.Threading.Thread.StartCallback()
2026-09-15T04:51:20.474181091Z [04:51:20] [INF] [1] Emby.Server.Implementations.AppBase.BaseConfigurationManager: Setting cache path: /cache
2026-09-15T04:51:20.640977689Z [04:51:20] [INF] [9] Jellyfin.Server.ServerSetupApp.SetupServer: Kestrel is listening on 0.0.0.0
2026-09-15T04:51:20.666678277Z [04:51:20] [INF] [9] Main: Jellyfin version: 12.0.0
2026-09-15T04:51:20.671138683Z [04:51:20] [INF] [9] Main: Environment Variables: ["[JELLYFIN_FFMPEG, /usr/lib/jellyfin-ffmpeg/ffmpeg]", "[JELLYFIN_LOG_DIR, /config/log]", "[JELLYFIN_WEB_DIR, /jellyfin/jellyfin-web]", "[JELLYFIN_CONFIG_DIR, /config/config]", "[JELLYFIN_DATA_DIR, /config]", "[JELLYFIN_CACHE_DIR, /cache]"]
2026-09-15T04:51:20.671209904Z [04:51:20] [INF] [9] Main: Arguments: ["/jellyfin/jellyfin.dll"]
2026-09-15T04:51:20.671795430Z [04:51:20] [INF] [9] Main: Operating system: Debian GNU/Linux 13 (trixie)
2026-09-15T04:51:20.672366258Z [04:51:20] [INF] [9] Main: Architecture: X64
2026-09-15T04:51:20.672503850Z [04:51:20] [INF] [9] Main: 64-Bit Process: True
2026-09-15T04:51:20.672595384Z [04:51:20] [INF] [9] Main: User Interactive: True
2026-09-15T04:51:20.672599358Z [04:51:20] [INF] [9] Main: Processor count: 6
2026-09-15T04:51:20.672651277Z [04:51:20] [INF] [9] Main: Program data path: /config
2026-09-15T04:51:20.672684942Z [04:51:20] [INF] [9] Main: Log directory path: /config/log
2026-09-15T04:51:20.672689101Z [04:51:20] [INF] [9] Main: Config directory path: /config/config
2026-09-15T04:51:20.672715793Z [04:51:20] [INF] [9] Main: Cache path: /cache
2026-09-15T04:51:20.672819794Z [04:51:20] [INF] [9] Main: Temp directory path: /tmp/jellyfin
2026-09-15T04:51:20.672924141Z [04:51:20] [INF] [9] Main: Web resources path: /jellyfin/jellyfin-web
2026-09-15T04:51:20.672987184Z [04:51:20] [INF] [9] Main: Application directory: /jellyfin/
2026-09-15T04:51:20.676584678Z [04:51:20] [INF] [9] Jellyfin.Server.Startup: Storage path `/config/data` (Fixed) successfully checked with 529.8GiB free which is over the minimum of 2GiB.
2026-09-15T04:51:20.676887474Z [04:51:20] [INF] [9] Jellyfin.Server.Startup: Storage path `/cache` (Fixed) successfully checked with 529.8GiB free which is over the minimum of 2GiB.
2026-09-15T04:51:20.677030875Z [04:51:20] [INF] [9] Jellyfin.Server.Startup: Storage path `/config` (Fixed) successfully checked with 529.8GiB free which is over the minimum of 2GiB.
2026-09-15T04:51:20.679703360Z [04:51:20] [INF] [9] Emby.Server.Implementations.AppBase.BaseConfigurationManager: Setting cache path: /cache
2026-09-15T04:51:20.739916651Z [04:51:20] [INF] [9] Jellyfin.Database.Providers.Sqlite.SqliteDatabaseProvider: SQLite connection string: Data Source=/config/data/jellyfin.db;Cache=Private;Default Timeout=60;Pooling=True
2026-09-15T04:51:20.745502181Z [04:51:20] [INF] [9] Jellyfin.Database.Providers.Sqlite.SqliteDatabaseProvider: SQLITE connection pragma command set to:
2026-09-15T04:51:20.745528320Z PRAGMA locking_mode=NORMAL;
2026-09-15T04:51:20.745531303Z PRAGMA journal_size_limit=134217728;
2026-09-15T04:51:20.745533583Z PRAGMA synchronous=1;
2026-09-15T04:51:20.745535776Z PRAGMA temp_store=2;
2026-09-15T04:51:20.745537950Z
2026-09-15T04:51:20.746514372Z [04:51:20] [INF] [9] Jellyfin.Database.Implementations.Locking.NoLockBehavior: The database locking mode has been set to: NoLock.
2026-09-15T04:51:20.778189193Z [04:51:20] [INF] [9] Jellyfin.Server.Migrations.JellyfinMigrationService: Initialise Migration service.
2026-09-15T04:51:21.740121213Z [04:51:21] [INF] [9] Emby.Server.Implementations.AppBase.BaseConfigurationManager: Setting cache path: /cache
2026-09-15T04:51:21.790792357Z [04:51:21] [INF] [9] Emby.Server.Implementations.ApplicationHost: Loading assemblies
2026-09-15T04:51:21.798957594Z [04:51:21] [INF] [9] Emby.Server.Implementations.Plugins.PluginManager: Loaded assembly Novell.Directory.Ldap.NETStandard, Version=3.6.0.0, Culture=neutral, PublicKeyToken=510c34e9dec7f86f from /config/plugins/LDAP Authentication_23.0.0.0/Novell.Directory.Ldap.NETStandard.dll
2026-09-15T04:51:21.799917638Z [04:51:21] [INF] [9] Emby.Server.Implementations.Plugins.PluginManager: Loaded assembly LDAP-Auth, Version=23.0.0.0, Culture=neutral, PublicKeyToken=null from /config/plugins/LDAP Authentication_23.0.0.0/LDAP-Auth.dll
2026-09-15T04:51:21.829517377Z [04:51:21] [INF] [9] Jellyfin.Networking.Manager.NetworkManager: Defined LAN subnets: ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
2026-09-15T04:51:21.829857658Z [04:51:21] [INF] [9] Jellyfin.Networking.Manager.NetworkManager: Defined LAN exclusions: []
2026-09-15T04:51:21.831534504Z [04:51:21] [INF] [9] Jellyfin.Networking.Manager.NetworkManager: Used LAN subnets: ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
2026-09-15T04:51:21.832876708Z [04:51:21] [INF] [9] Jellyfin.Networking.Manager.NetworkManager: Filtered interface addresses: ["127.0.0.1", "172.16.1.16"]
2026-09-15T04:51:21.833119529Z [04:51:21] [INF] [9] Jellyfin.Networking.Manager.NetworkManager: Bind Addresses ["0.0.0.0"]
2026-09-15T04:51:21.833180324Z [04:51:21] [INF] [9] Jellyfin.Networking.Manager.NetworkManager: Remote IP filter is Allowlist
2026-09-15T04:51:21.833252826Z [04:51:21] [INF] [9] Jellyfin.Networking.Manager.NetworkManager: Filtered subnets: []
2026-09-15T04:51:21.941970746Z [04:51:21] [INF] [9] Jellyfin.Database.Providers.Sqlite.SqliteDatabaseProvider: SQLite connection string: Data Source=/config/data/jellyfin.db;Cache=Private;Default Timeout=60;Pooling=True
2026-09-15T04:51:21.942124346Z [04:51:21] [INF] [9] Jellyfin.Database.Providers.Sqlite.SqliteDatabaseProvider: SQLITE connection pragma command set to:
2026-09-15T04:51:21.942154982Z PRAGMA locking_mode=NORMAL;
2026-09-15T04:51:21.942157841Z PRAGMA journal_size_limit=134217728;
2026-09-15T04:51:21.942172953Z PRAGMA synchronous=1;
2026-09-15T04:51:21.942175887Z PRAGMA temp_store=2;
2026-09-15T04:51:21.942178125Z
2026-09-15T04:51:21.942552078Z [04:51:21] [INF] [9] Jellyfin.Database.Implementations.Locking.NoLockBehavior: The database locking mode has been set to: NoLock.
2026-09-15T04:51:21.986054402Z [04:51:21] [INF] [9] Main: Prepare system for possible migrations
2026-09-15T04:51:22.142304250Z [04:51:22] [INF] [9] Emby.Server.Implementations.Plugins.PluginManager: Loaded plugin: LDAP-Auth 23.0.0.0
2026-09-15T04:51:22.143359811Z [04:51:22] [INF] [9] Emby.Server.Implementations.Plugins.PluginManager: Loaded plugin: TMDb 12.0.0.0
2026-09-15T04:51:22.143807985Z [04:51:22] [INF] [9] Emby.Server.Implementations.Plugins.PluginManager: Loaded plugin: Studio Images 12.0.0.0
2026-09-15T04:51:22.144140193Z [04:51:22] [INF] [9] Emby.Server.Implementations.Plugins.PluginManager: Loaded plugin: OMDb 12.0.0.0
2026-09-15T04:51:22.156408782Z [04:51:22] [INF] [9] Emby.Server.Implementations.Plugins.PluginManager: Loaded plugin: MusicBrainz 12.0.0.0
2026-09-15T04:51:22.156756175Z [04:51:22] [INF] [9] Emby.Server.Implementations.Plugins.PluginManager: Loaded plugin: ListenBrainz Similarity Provider 12.0.0.0
2026-09-15T04:51:22.157083043Z [04:51:22] [INF] [9] Emby.Server.Implementations.Plugins.PluginManager: Loaded plugin: AudioDB 12.0.0.0
2026-09-15T04:51:22.203355726Z [04:51:22] [INF] [9] Emby.Server.Implementations.Library.Search.SearchManager: Registered 0 external search providers: . Fallback providers: Database (priority 100)
2026-09-15T04:51:22.222226745Z [04:51:22] [WRN] [11] Microsoft.AspNetCore.DataProtection.Repositories.EphemeralXmlRepository: Using an in-memory repository. Keys will not be persisted to storage.
2026-09-15T04:51:22.222493448Z [04:51:22] [WRN] [11] Microsoft.AspNetCore.DataProtection.KeyManagement.XmlKeyManager: Neither user profile nor HKLM registry available. Using an ephemeral key repository. Protected data will be unavailable when application exits.
2026-09-15T04:51:22.523053845Z [04:51:22] [INF] [11] Main: Kestrel is listening on 0.0.0.0
2026-09-15T04:51:22.534009227Z [04:51:22] [WRN] [11] Microsoft.AspNetCore.DataProtection.KeyManagement.XmlKeyManager: No XML encryptor configured. Key {f75c814f-a8d1-43a6-84fc-8988b8e9d27b} may be persisted to storage in unencrypted form.
2026-09-15T04:51:23.254453509Z [04:51:23] [WRN] [11] Microsoft.AspNetCore.StaticFiles.StaticFileMiddleware: The WebRootPath was not found: /wwwroot. Static files may be unavailable.
2026-09-15T04:51:23.288461065Z [04:51:23] [INF] [11] Emby.Server.Implementations.ApplicationHost: Running startup tasks
2026-09-15T04:51:23.290496708Z [04:51:23] [INF] [9] Emby.Server.Implementations.IO.LibraryMonitor: Watching directory /data/movies
2026-09-15T04:51:23.293015527Z [04:51:23] [INF] [16] Emby.Server.Implementations.IO.LibraryMonitor: Watching directory /data/series
2026-09-15T04:51:23.308452745Z [04:51:23] [INF] [11] Emby.Server.Implementations.ScheduledTasks.TaskManager: Daily trigger for Generate Trickplay Images set to fire at 2026-09-16 03:00:00.000 +00:00, which is 22:08:36.6919733 from now.
2026-09-15T04:51:23.312444654Z [04:51:23] [INF] [11] Emby.Server.Implementations.ScheduledTasks.TaskManager: Daily trigger for Extract Chapter Images set to fire at 2026-09-16 02:00:00.000 +00:00, which is 21:08:36.6877118 from now.
2026-09-15T04:51:23.340561484Z [04:51:23] [INF] [11] MediaBrowser.MediaEncoding.Encoder.MediaEncoder: Found ffmpeg version 8.1.2
2026-09-15T04:51:23.369843414Z [04:51:23] [INF] [11] MediaBrowser.MediaEncoding.Encoder.MediaEncoder: Available decoders: ["libdav1d", "av1", "av1_cuvid", "av1_qsv", "h264", "h264_qsv", "h264_cuvid", "hevc", "hevc_qsv", "hevc_cuvid", "mpeg2video", "mpeg2_qsv", "mpeg2_cuvid", "mpeg4", "mpeg4_cuvid", "msmpeg4", "vc1_qsv", "vc1_cuvid", "vp8", "libvpx", "vp8_cuvid", "vp8_qsv", "vp9", "libvpx-vp9", "vp9_cuvid", "vp9_qsv", "aac", "ac3", "ac4", "dca", "flac", "mp3", "truehd"]
2026-09-15T04:51:23.385856792Z [04:51:23] [INF] [11] MediaBrowser.MediaEncoding.Encoder.MediaEncoder: Available encoders: ["libsvtav1", "av1_nvenc", "av1_qsv", "av1_amf", "av1_vaapi", "libx264", "h264_amf", "h264_nvenc", "h264_qsv", "h264_v4l2m2m", "h264_vaapi", "libx265", "hevc_amf", "hevc_nvenc", "hevc_qsv", "hevc_vaapi", "mjpeg_qsv", "mjpeg_vaapi", "aac", "libfdk_aac", "ac3", "alac", "dca", "flac", "libmp3lame", "libopus", "truehd", "libvorbis", "srt"]
2026-09-15T04:51:23.402419593Z [04:51:23] [INF] [11] MediaBrowser.MediaEncoding.Encoder.MediaEncoder: Available filters: ["bwdif_cuda", "bwdif_opencl", "deinterlace_qsv", "deinterlace_vaapi", "flip_vulkan", "hwupload_cuda", "hwupload_vaapi", "libplacebo", "overlay_opencl", "overlay_qsv", "overlay_vaapi", "overlay_vulkan", "overlay_cuda", "procamp_vaapi", "scale_cuda", "scale_opencl", "scale_qsv", "scale_vaapi", "scale_vulkan", "tonemapx", "tonemap_cuda", "tonemap_opencl", "tonemap_vaapi", "transpose_cuda", "transpose_opencl", "transpose_vaapi", "transpose_vulkan", "vpp_qsv", "yadif_cuda", "yadif_opencl", "zscale", "alphasrc"]
2026-09-15T04:51:23.616223762Z [04:51:23] [INF] [11] MediaBrowser.MediaEncoding.Encoder.MediaEncoder: Available hwaccel types: ["cuda", "vaapi", "qsv", "drm", "opencl", "vulkan", "amf"]
2026-09-15T04:51:24.291445016Z [04:51:24] [INF] [7] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 request
2026-09-15T04:51:24.291463388Z [04:51:24] [INF] [16] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 request
2026-09-15T04:51:25.068585343Z [04:51:25] [INF] [11] MediaBrowser.MediaEncoding.Encoder.MediaEncoder: FFmpeg: /usr/lib/jellyfin-ffmpeg/ffmpeg
2026-09-15T04:51:25.068601816Z [04:51:25] [INF] [11] Emby.Server.Implementations.ApplicationHost: ServerId: fb9caae350db41d6a44dc9ea45d1ab8d
2026-09-15T04:51:25.068604881Z [04:51:25] [INF] [11] Emby.Server.Implementations.ApplicationHost: Core startup complete
2026-09-15T04:51:25.068733985Z [04:51:25] [INF] [11] Main: Startup complete 0:00:04.8812697
2026-09-15T04:51:25.648973218Z [04:51:25] [INF] [16] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 request
2026-09-15T04:51:26.323054040Z [04:51:26] [INF] [16] Emby.Server.Implementations.ScheduledTasks.TaskManager: Clean Transcode Directory Completed after 0 minute(s) and 0 seconds
2026-09-15T04:51:27.132245267Z [04:51:27] [INF] [7] Emby.Server.Implementations.ScheduledTasks.TaskManager: Update Plugins Completed after 0 minute(s) and 0 seconds
2026-09-15T04:51:28.949954313Z [04:51:28] [WRN] [7] Emby.Server.Implementations.HttpServer.WebSocketConnection: WS 172.16.1.22 error receiving data: The remote party closed the WebSocket connection without completing the close handshake.
2026-09-15T04:51:28.953264368Z [04:51:28] [INF] [7] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 closed
2026-09-15T04:51:29.955749667Z [04:51:29] [WRN] [7] Emby.Server.Implementations.HttpServer.WebSocketConnection: WS 172.16.1.22 error receiving data: The remote party closed the WebSocket connection without completing the close handshake.
2026-09-15T04:51:29.964211179Z [04:51:29] [INF] [7] Emby.Server.Implementations.HttpServer.WebSocketManager: WS 172.16.1.22 closed

```

### FFmpeg logs

```shell

```

### Client / Browser logs

_No response_

### Relevant screenshots or videos

_No response_

### Additional information

_No response_
