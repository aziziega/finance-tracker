@echo off
echo Menghapus file troubleshooting lama...

del /F /Q "DIAGNOSTIC_UUID_ERROR.md" 2>nul
del /F /Q "FIX_TYPE_MISMATCH_ERROR.md" 2>nul
del /F /Q "QUICK_FIX_DATABASE_ERROR.md" 2>nul
del /F /Q "TROUBLESHOOTING_DATABASE_ERROR.md" 2>nul
del /F /Q "FIX_STORED_PROCEDURE_QUICK.sql" 2>nul

echo.
echo ✅ File lama berhasil dihapus!
echo.
echo File dokumentasi yang tersisa:
echo - README.md (Main documentation)
echo - DATABASE_SETUP.md (Setup guide) 
echo - RATE_LIMITING_README.md (Rate limiting)
echo - SCALABILITY_ASSESSMENT.md (Scalability)
echo - STORED_PROCEDURES_README.md (SP concepts)
echo - IMPLEMENTATION_CHECKLIST.md (Progress)
echo - DOCS_INDEX.md (Navigation)
echo - PROJECT_FIX_SUMMARY.md (Fix summary)
echo.
echo File SQL:
echo - supabase-stored-procedures.sql (Production ready)
echo.
pause
