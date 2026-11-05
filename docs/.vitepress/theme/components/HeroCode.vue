<script setup lang="ts">
import { ref } from 'vue';

// Clicking a driver swaps the disk name in the snippet, showing that
// switching backends is a config change, not a code change.
const disks = ['local', 's3', 'r2', 'gcs', 'azure'] as const;
const active = ref<(typeof disks)[number]>('s3');
</script>

<template>
  <figure
    class="hero-code"
    aria-label="Example controller using @oxth/nestjs-storage"
  >
    <div class="hero-code__bar">
      <span class="hero-code__dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="hero-code__file">avatars.controller.ts</span>
    </div>
    <pre class="hero-code__body"><code><span class="t-dec">@Post</span>()
<span class="t-dec">@UseInterceptors</span>(
  <span class="t-fn">StorageFileInterceptor</span>(<span class="t-str">'avatar'</span>, { disk: <span class="t-str t-disk">'{{ active }}'</span> }),
)
<span class="t-kw">async</span> <span class="t-fn">upload</span>(<span class="t-dec">@UploadedFile</span>() file: <span class="t-type">StoredFile</span>) {
  <span class="t-kw">return</span> <span class="t-kw">this</span>.storage
    .<span class="t-fn">disk</span>(<span class="t-str t-disk">'{{ active }}'</span>)
    .<span class="t-fn">getSignedUrl</span>(file.path, { expiresIn: <span class="t-str">'15m'</span> });
}</code></pre>
    <div
      class="hero-code__disks"
      role="group"
      aria-label="Try a different disk"
    >
      <span class="hero-code__label">disk</span>
      <button
        v-for="disk in disks"
        :key="disk"
        type="button"
        class="hero-code__chip"
        :aria-pressed="active === disk"
        @click="active = disk"
      >
        {{ disk }}
      </button>
    </div>
  </figure>
</template>

<style scoped>
.hero-code {
  position: relative;
  z-index: 1;
  margin: 0;
  width: 100%;
  max-width: 520px;
  border: 1px solid var(--ns-code-border);
  border-radius: 14px;
  background: var(--ns-code-bg);
  box-shadow: var(--ns-code-shadow);
  overflow: hidden;
  text-align: left;
}

.hero-code__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ns-code-border);
}

.hero-code__dots {
  display: inline-flex;
  gap: 6px;
}

.hero-code__dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ns-code-dot);
}

.hero-code__file {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--ns-code-muted);
}

.hero-code__body {
  margin: 0;
  padding: 16px 18px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--ns-code-fg);
}

.t-kw {
  color: var(--ns-code-kw);
}
.t-fn {
  color: var(--ns-code-fn);
}
.t-str {
  color: var(--ns-code-str);
}
.t-dec {
  color: var(--ns-code-dec);
}
.t-type {
  color: var(--ns-code-type);
}

.t-disk {
  border-radius: 4px;
  background: var(--ns-code-highlight);
  padding: 1px 2px;
  transition: background-color 0.2s ease;
}

.hero-code__disks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--ns-code-border);
}

.hero-code__label {
  margin-right: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--ns-code-muted);
}

.hero-code__chip {
  min-height: 36px;
  min-width: 52px;
  padding: 0 12px;
  border: 1px solid var(--ns-code-border);
  border-radius: 999px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--ns-code-fg);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.hero-code__chip:hover {
  border-color: var(--ns-code-str);
}

.hero-code__chip[aria-pressed='true'] {
  border-color: var(--ns-code-str);
  background: var(--ns-code-highlight);
  color: var(--ns-code-str);
}

.hero-code__chip:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

@media (max-width: 639px) {
  .hero-code__body {
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .t-disk,
  .hero-code__chip {
    transition: none;
  }
}
</style>
