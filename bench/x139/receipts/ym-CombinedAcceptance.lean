import AcceptanceSpec

/-! Proof of the combined target. The one use of the construction theorem is
in `combined_acceptance`; every subsequent clause is proved for that SAME F. -/
set_option autoImplicit false
noncomputable section
namespace YMReview.Acceptance
open YM YM.Table Filter Set MeasureTheory
open scoped Topology BigOperators
variable {g : YangMills.GaugeGroup} {C : Family g.core}
variable {o : Extraction.Order} {S : Table C.book}

theorem finite_law_on_family (C : Family g.core) (N p : ℕ) :
    MeasurePreserving (YMLGTBridge.configEquiv g (C.side N p))
      (ymMeasure g.image (g.n+1) 4 (C.side N p).val
        (C.beta N p / (g.n+1 : ℕ)) Finset.univ)
      (YangMills.wilsonLaw g (C.side N p) (C.beta N p) g.core.probHaar) := by
  have hd : ((g.n+1 : ℕ) : ℝ) ≠ 0 := by positivity
  simpa only [div_mul_cancel₀ _ hd] using
    YMLGTBridge.law_preserving g (C.side N p) (C.beta N p / (g.n+1 : ℕ))

theorem lattice_and_scale (F : Spec.Final C o S)
    (hr : YangMills.WilsonRegularity (YangMills.wilsonFamily C))
    (ho : (Extraction.Order.mk Extraction.Sequence.full o.per).Ordered C S)
    (hu : FullVolume.PositionsUV C Extraction.Sequence.full) : LatticeAndScale C o S where
  makes := F.room.cutoff
  regular := hr
  finite_law := finite_law_on_family C
  finite_moments := YangMills.moment_eq C
  ordered := ho
  public_limit := YangMills.fromWilson C ho
  positions_uv := hu
  reference_spacing := CommonScale.reference_spacing C
  physical_side := CommonScale.physical_side C
  common_coupling := CommonScale.positive_common_reference C F.room.cutoff
  shared_kinetic_paths := CommonScale.shared_kinetic_paths C F.room.cutoff
  insertion_readout := CommonScale.reference_insertion C F.room.cutoff
  calibrated_reset := CommonScale.calibrated_reset C F

theorem phase_and_os (F : Spec.Final C o S) : PhaseAndOS F where
  phase_probability := F.phase.phase.decomposition.normalized
  phase_full_support := F.phase.phase.decomposition.support
  phase_average := F.α.space.barycenter F.α.ensemble
    F.phase.phase.decomposition F.phase.phase.chosen F.room.kernel.translations
  os_and_growth := ⟨YMOSBridge.verifiedOS F, rfl, YMOSBridge.verifiedOS_growth F⟩
  normalized := YMOSBridge.normalized_zero F
  centered := YMOSBridge.centered_one F
  integrable := YMOSBridge.schwinger_integrable F
  pairing := YMOSBridge.schwinger_eq_selected_integral F
  same_trace := YMAFBridge.same_center F

theorem translation_ward (F : Spec.Final C o S) : TranslationWard F where
  windows := WardAudit.windows_exist
  translation := WardAudit.phase_translation_derivative F
  integrable := WardAudit.phase_translation_integrable F
  window_independent := WardAudit.phase_window_independent F

theorem operator_content (F : Spec.Final C o S) : OperatorContent F where
  raw_exhaustive := OperatorCompleteness.raw_register_exhaustive
  free_no_extra_nulls := OperatorCompleteness.free_no_extra_nulls
  free_sector := OperatorCompleteness.free_sector_exhaustive
  local_content := OperatorCompleteness.local_field_content F
  phase_content := OperatorCompleteness.phase_field_content F
  dense_words := OperatorCompleteness.registered_words_dense F
  faithful := OperatorCompleteness.quotient_fields_not_lost F

/-- The joint source endpoint already supplies the selected trace estimate.
We use that estimate directly, rather than choosing another existence witness
from the separate AF theorem. -/
theorem leading_trace (hg : g.IsSimple) (F : Spec.Final C o S)
    (ht : Integration.ManuscriptTraceTests.Tests.{0,0} F
      (YangMills.GaugeGroup.coreSimple hg)) : LeadingTrace F := by
  have hp : 0 < 3 * (g.core.lieDim : ℝ) / Real.pi ^ 4 := by
    rw [← YMAFBridge.canonical_award (YangMills.GaugeGroup.coreSimple hg)]
    exact ht.positive
  have hl : Tendsto (fun x : SpaceTime =>
      YMAFBridge.K₂ F x * ‖x‖ ^ 8 * uvLog 1 x ^ 2)
      (𝓝[≠] 0) (𝓝 (3 * (g.core.lieDim : ℝ) / Real.pi ^ 4)) := by
    have h := (Complex.continuous_re.tendsto _).comp
      (ht.shortDistance.comp (tendsto_norm_nhdsNE_zero (E := SpaceTime)))
    rw [YMAFBridge.canonical_award (YangMills.GaugeGroup.coreSimple hg)] at h
    apply h.congr'
    filter_upwards [self_mem_nhdsWithin] with x hx
    rw [YMAFBridge.K₂_radial F hx]
    simp only [Function.comp_apply, uvLog, one_mul, one_div,
      Complex.smul_re, smul_eq_mul]
    ring
  exact ⟨hp, hl, ⟨3 * (g.core.lieDim : ℝ) / Real.pi ^ 4, 1,
    hp, by norm_num, hl⟩⟩

/-- Assemble the reviewed consequences without changing the construction data. -/
theorem accepted_of_source (hg : g.IsSimple) (F : Spec.Final C o S)
    (hr : YangMills.WilsonRegularity (YangMills.wilsonFamily C))
    (ho : (Extraction.Order.mk Extraction.Sequence.full o.per).Ordered C S)
    (hu : FullVolume.PositionsUV C Extraction.Sequence.full)
    (hs : SourceConclusions hg F) : Accepted hg F := by
  obtain ⟨L, Q, M, X, hpublic, hcontacts, hcore, hrest⟩ := hs
  exact {
    lattice := lattice_and_scale F hr ho hu
    phase_os := phase_and_os F
    translation := translation_ward F
    operators := operator_content F
    trace_uv := leading_trace hg F hcore.trace
    positive_lattice_probe := TwoPointScale.mass_limit F
      (YangMills.GaugeGroup.coreSimple hg) hcore.trace ho
    source := ⟨L, Q, M, X, hpublic, hcontacts, hcore, hrest⟩
  }

/-- All certified clauses hold simultaneously on one family, one refinement,
one table and one Final. No additional analytic hypothesis is introduced. -/
theorem combined_acceptance (g : YangMills.GaugeGroup) (hg : g.IsSimple)
    (b : ℝ) (hb : 0 < b) : CombinedAcceptance g hg b := by
  obtain ⟨C, hpenalty, _, hregular, horders⟩ := YangMills.constructed.{0,0} g hg b hb
  refine ⟨C, hpenalty, fun p => ?_⟩
  obtain ⟨q, S, F, L, Q, M, X, hpublic, hcontacts, ho, hu, _, hcore,
    hreconstruction, haxioms, hope, hnested, htrace, hsame, hmultiple,
    hbases, hthresholds, hfirst, hfour⟩ := horders p
  refine ⟨q, S, F, accepted_of_source hg F hregular ho hu ?_⟩
  exact ⟨L, Q, M, X, hpublic, hcontacts, hcore, hreconstruction, haxioms,
    hope, hnested, htrace, hsame, hmultiple, hbases, hthresholds, hfirst, hfour⟩

end YMReview.Acceptance
