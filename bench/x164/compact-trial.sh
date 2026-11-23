set -e
# Existing baseline receipts are retained, not re-encoded opportunistically.
for name in files-browse net-wireless-connect terminal; do
 ext=page; if [ "$name" = terminal ]; then ext=props; fi
 if [ -f bench/x164/receipts/$name-candidate.json ]; then cp bench/x164/receipts/$name-candidate.json bench/x164/receipts/$name-slash.original.json; fi
 node --max-old-space-size=1100 bench/x164/trial.mjs bench/x164/fixtures/$name.$ext candidate bench/x164/receipts/$name-candidate.json
done
for arm in base candidate; do node --max-old-space-size=1100 bench/x164/trial.mjs bench/x164/fixtures/shell-introduction.page $arm bench/x164/receipts/shell-introduction-$arm.json; done
