' Runs start-server.bat with no visible window, so the server starts silently
' in the background when Windows logs in.

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & scriptDir & "\start-server.bat""", 0, False
