# Evidence

Proof artifacts from a verify-pointer run live here, one directory per run:

```
evidence/<feature-id>-<ISO-timestamp>/
  run-record.md
  run-record.json
  *.png
  *.aria.txt
```

`helpers/cleanup` never deletes this directory. Launch scratch (PIDs, logs) lives in `../.run/` and is discarded.
