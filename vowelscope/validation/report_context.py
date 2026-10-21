"""Preserve execution metadata in public aggregates without token-level data."""

FIELDS=('schema_version','replay_protocol','smoothing','smoothing_value','measurement',
        'dsp_variant','source_html','source_assets','source_commit','source_dirty',
        'code_digest','page_digest','dsp_patch_digest','split')


def report_context(report):
    context={key:report[key] for key in FIELDS if key in report}
    context.setdefault('replay_protocol','legacy-unversioned')
    context['provenance_complete']=all(report.get(key) is not None for key in
        ('schema_version','replay_protocol','smoothing_value','source_commit','source_dirty','code_digest'))
    return context


def replay_compatible(first,second):
    """Different code may be compared, but unknown/different measurement protocols may not."""
    required=('replay_protocol','smoothing_value','measurement')
    return all(first.get(key) is not None and first.get(key)==second.get(key) for key in required)


def smoothing_alpha(report):
    # Legacy reports predate recorded slider defaults; identify them explicitly.
    value=report.get('smoothing_value',60 if report.get('smoothing')=='default' else
                     0 if report.get('smoothing')=='fast' else -53.3333333333333)
    return round(.08+(100-float(value))*.006,12)
