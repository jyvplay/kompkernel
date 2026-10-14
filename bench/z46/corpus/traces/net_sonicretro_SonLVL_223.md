When I try to use Sonlvl there's a pop-up saying:
Unhandled Exception
DirectoryNotFoundException

Program: SonLVL
Build Date: 04/25/2026 07:39:32
OS Version: Microsoft Windows NT 6.2.9200.0
Log:
Operating system: Microsoft Windows NT 6.2.9200.0
System.IO.DirectoryNotFoundException: Could not find a part of the path 'C:\Users\lisau\OneDrive\Desktop\Joshua's Stuff\Tools\SonLvl and SonMapEd\HUD\HUD.ini'.
   at System.IO.__Error.WinIOError(Int32 errorCode, String maybeFullPath)
   at System.IO.FileStream.Init(String path, FileMode mode, FileAccess access, Int32 rights, Boolean useRights, FileShare share, Int32 bufferSize, FileOptions options, SECURITY_ATTRIBUTES secAttrs, String msgPath, Boolean bFromProxy, Boolean useLongPath, Boolean checkHost)
   at System.IO.FileStream..ctor(String path, FileMode mode, FileAccess access, FileShare share, Int32 bufferSize, FileOptions options, String msgPath, Boolean bFromProxy, Boolean useLongPath, Boolean checkHost)
   at System.IO.StreamReader..ctor(String path, Encoding encoding, Boolean detectEncodingFromByteOrderMarks, Int32 bufferSize, Boolean checkHost)
   at System.IO.StreamReader..ctor(String path, Encoding encoding)
   at System.IO.File.InternalReadAllLines(String path, Encoding encoding)
   at System.IO.File.ReadAllLines(String path)
   at SonicRetro.SonLVL.API.IniSerializer.Deserialize[T](String filename) in C:\Programs\SonLVL\SonLVLAPI\IniSerializer.cs:line 169
   at SonicRetro.SonLVL.GUI.MainForm.MainForm_Load(Object sender, EventArgs e) in C:\Programs\SonLVL\SonLVL\MainForm.cs:line 240
   at System.Windows.Forms.Form.OnLoad(EventArgs e)
   at System.Windows.Forms.Form.OnCreateControl()
   at System.Windows.Forms.Control.CreateControl(Boolean fIgnoreVisible)
   at System.Windows.Forms.Control.CreateControl()
   at System.Windows.Forms.Control.WmShowWindow(Message& m)
   at System.Windows.Forms.Control.WndProc(Message& m)
   at System.Windows.Forms.ScrollableControl.WndProc(Message& m)
   at System.Windows.Forms.ContainerControl.WndProc(Message& m)
   at System.Windows.Forms.Form.WmShowWindow(Message& m)
   at System.Windows.Forms.Form.WndProc(Message& m)
   at System.Windows.Forms.Control.ControlNativeWindow.OnMessage(Message& m)
   at System.Windows.Forms.Control.ControlNativeWindow.WndProc(Message& m)
   at System.Windows.Forms.NativeWindow.Callback(IntPtr hWnd, Int32 msg, IntPtr wparam, IntPtr lparam)
Opening INI file "C:\Users\lisau\OneDrive\Desktop\Joshua's Stuff\My Mod\S3 Pallete Mod\SonLVL.ini"...
Game type is S3K.
System.IO.DirectoryNotFoundException: Could not find a part of the path 'C:\Users\lisau\OneDrive\Desktop\Joshua's Stuff\Tools\SonLvl and SonMapEd\loadanim\anims.ini'.
   at System.IO.__Error.WinIOError(Int32 errorCode, String maybeFullPath)
   at System.IO.FileStream.Init(String path, FileMode mode, FileAccess access, Int32 rights, Boolean useRights, FileShare share, Int32 bufferSize, FileOptions options, SECURITY_ATTRIBUTES secAttrs, String msgPath, Boolean bFromProxy, Boolean useLongPath, Boolean checkHost)
   at System.IO.FileStream..ctor(String path, FileMode mode, FileAccess access, FileShare share, Int32 bufferSize, FileOptions options, String msgPath, Boolean bFromProxy, Boolean useLongPath, Boolean checkHost)
   at System.IO.StreamReader..ctor(String path, Encoding encoding, Boolean detectEncodingFromByteOrderMarks, Int32 bufferSize, Boolean checkHost)
   at System.IO.StreamReader..ctor(String path, Encoding encoding)
   at System.IO.File.InternalReadAllLines(String path, Encoding encoding)
   at System.IO.File.ReadAllLines(String path)
   at SonicRetro.SonLVL.AnimationInfo.Load(String filename) in C:\Programs\SonLVL\SonLVL\AnimationInfo.cs:line 42
   at SonicRetro.SonLVL.GUI.MainForm.LevelToolStripMenuItem_Clicked(Object sender, EventArgs e) in C:\Programs\SonLVL\SonLVL\MainForm.cs:line 530
   at System.Windows.Forms.ToolStripItem.RaiseEvent(Object key, EventArgs e)
   at System.Windows.Forms.ToolStripMenuItem.OnClick(EventArgs e)
   at System.Windows.Forms.ToolStripItem.HandleClick(EventArgs e)
   at System.Windows.Forms.ToolStripItem.HandleMouseUp(MouseEventArgs e)
   at System.Windows.Forms.ToolStripItem.FireEventInteractive(EventArgs e, ToolStripItemEventType met)
   at System.Windows.Forms.ToolStripItem.FireEvent(EventArgs e, ToolStripItemEventType met)
   at System.Windows.Forms.ToolStrip.OnMouseUp(MouseEventArgs mea)
   at System.Windows.Forms.ToolStripDropDown.OnMouseUp(MouseEventArgs mea)
   at System.Windows.Forms.Control.WmMouseUp(Message& m, MouseButtons button, Int32 clicks)
   at System.Windows.Forms.Control.WndProc(Message& m)
   at System.Windows.Forms.ScrollableControl.WndProc(Message& m)
   at System.Windows.Forms.ToolStrip.WndProc(Message& m)
   at System.Windows.Forms.ToolStripDropDown.WndProc(Message& m)
   at System.Windows.Forms.Control.ControlNativeWindow.OnMessage(Message& m)
   at System.Windows.Forms.Control.ControlNativeWindow.WndProc(Message& m)
   at System.Windows.Forms.NativeWindow.Callback(IntPtr hWnd, Int32 msg, IntPtr wparam, IntPtr lparam)

How can I solve this issue?

