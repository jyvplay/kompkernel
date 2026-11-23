for name in terminal sdk NuGet.Client; do
 for arm in base candidate; do
  node --max-old-space-size=1100 bench/x164/trial.mjs bench/x164/fixtures/$name.props $arm bench/x164/receipts/$name-$arm.json || exit $?
 done
done
