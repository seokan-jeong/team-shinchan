<article data-ts-kind="progress" data-ts-doc-id="{{DOC_ID}}" role="document">
<header data-ts-role="frontmatter">
<script type="application/json" id="ts-frontmatter">
{"document_type":"progress","status":"draft","stage":2,"created":"{{CREATED_DATE}}","doc_id":"{{DOC_ID}}","source":"REQUESTS.md","output_format":"html"}
</script>
<h1>PROGRESS — {{FEATURE_TITLE}}</h1>
</header>
<section data-ts-kind="overview"><h2>Overview</h2>
<p>{{OVERVIEW_DESCRIPTION}}</p>
<pre class="mermaid" data-ts-kind="diagram">
flowchart TD
  {{DIAGRAM_CONTENT}}
</pre></section>
<section data-ts-kind="wave-summary"><h2>Wave Execution Summary</h2>
<table>
<thead><tr><th>Wave</th><th>Phases</th><th>Parallel</th><th>Artifact Dependency</th></tr></thead>
<tbody>
<tr><td>Wave 1</td><td>{{WAVE_1_PHASES}}</td><td>{{WAVE_1_PARALLEL}}</td><td>{{WAVE_1_DEPENDENCY}}</td></tr>
</tbody></table></section>
<section class="ts-phase" data-ts-kind="phase" data-ts-id="P1"><h2>Phase 1: {{PHASE_TITLE}} ({{AC_REF}})</h2>
<dl>
<dt>Agent</dt><dd>{{AGENT_NAME}}</dd>
<dt>Wave</dt><dd>{{WAVE_NUMBER}} (parallel={{IS_PARALLEL}})</dd>
<dt>Depends on</dt><dd>{{PHASE_DEPENDENCY}}</dd>
<dt>artifact_dependency</dt><dd>{{ARTIFACT_DEPENDENCY}}</dd>
</dl>
<h3>Rationale</h3>
<p>{{RATIONALE_DESCRIPTION}}</p>
<p>Alternative rejected: {{ALTERNATIVE_REJECTED}}</p>
<h3>목표</h3>
<ul>
<li>{{GOAL_1}}</li>
<li>{{GOAL_2}}</li>
</ul>
<h3>변경 사항</h3>
<table>
<thead><tr><th>Action</th><th>File</th><th>Reason</th></tr></thead>
<tbody>
<tr><td>Create</td><td><code>{{NEW_FILE_PATH}}</code></td><td>{{CREATE_REASON}}</td></tr>
<tr><td>Modify</td><td><code>{{EXISTING_FILE_PATH}}</code></td><td>{{MODIFY_REASON}}</td></tr>
</tbody></table>
<section data-ts-kind="ac"><h3>성공 기준</h3>
<ul>
<li class="ts-ac" data-ts-id="AC-1a">[ ] AC-1a: {{AC_CRITERION_1}}</li>
<li class="ts-ac" data-ts-id="AC-1b">[ ] AC-1b: {{AC_CRITERION_2}}</li>
</ul></section>
<h3>Change Log</h3>
<table>
<thead><tr><th>Date</th><th>Author</th><th>Note</th></tr></thead>
<tbody>
<tr class="ts-change-log"><td>{{CREATED_DATE}}</td><td>{{AUTHOR}}</td><td>Phase defined</td></tr>
</tbody></table></section>
<section data-ts-kind="risk"><h2>Risk Register</h2>
<table>
<thead><tr><th>ID</th><th>Phase</th><th>Risk</th><th>Severity</th><th>Mitigation</th></tr></thead>
<tbody>
<tr class="ts-risk-register ts-risk-h" data-ts-id="R-1"><td>R-1</td><td>{{RISK_PHASE}}</td><td>{{RISK_DESCRIPTION}}</td><td>{{RISK_SEVERITY}}</td><td>{{RISK_MITIGATION}}</td></tr>
</tbody></table></section>
<section data-ts-kind="effort"><h2>Effort Estimates</h2>
<table>
<thead><tr><th>Phase</th><th>FR</th><th>Files Changed</th><th>Effort</th><th>Agent</th></tr></thead>
<tbody>
<tr class="ts-effort"><td>Phase 1</td><td>{{FR_REF}}</td><td>{{FILES_COUNT}}</td><td>{{EFFORT_SIZE}}</td><td>{{AGENT_NAME}}</td></tr>
</tbody></table></section>
<footer data-ts-role="validation"><h2>Validation Checklist</h2>
<ul>
<li>[ ] All FR items assigned to phases</li>
<li>[ ] All NFR items addressed</li>
<li>[ ] All HR items addressed</li>
<li>[ ] All risks have mitigations</li>
<li>[ ] All AC items covered by phase success criteria</li>
<li>[ ] File conflict analysis complete</li>
<li>[ ] Wave grouping validated — no file conflicts within same wave</li>
<li>[ ] artifact_dependency set where required</li>
<li>[ ] User approval pending</li>
</ul></footer>
</article>
