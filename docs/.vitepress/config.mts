import { createRequire } from 'node:module';
import { defineConfig } from 'vitepress';

const { version } = createRequire(import.meta.url)('../../package.json') as {
  version: string;
};

export default defineConfig({
  title: '@oxth/nestjs-storage',
  description:
    'A unified NestJS storage API for Local, S3, R2, GCS, Azure, and any S3-compatible service.',
  base: '/nestjs-storage/',

  head: [
    ['link', { rel: 'icon', href: '/nestjs-storage/favicon.svg' }],
    ['meta', { property: 'og:title', content: '@oxth/nestjs-storage' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'A unified NestJS storage API for Local, S3, R2, GCS, Azure, and any S3-compatible service.',
      },
    ],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
  ],

  lastUpdated: true,
  cleanUrls: true,

  themeConfig: {
    siteTitle: 'NestJS Storage',

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/oxth/nestjs-storage/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Drivers', link: '/drivers/', activeMatch: '/drivers/' },
      { text: 'API Reference', link: '/api/', activeMatch: '/api/' },
      {
        text: `v${version}`,
        items: [
          {
            text: 'Changelog',
            link: 'https://github.com/oxth/nestjs-storage/blob/main/CHANGELOG.md',
          },
          { text: 'Releases', link: 'https://github.com/oxth/nestjs-storage/releases' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@oxth/nestjs-storage' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Configuration', link: '/guide/configuration' },
          ],
        },
        {
          text: 'Essentials',
          items: [
            { text: 'File Uploads', link: '/guide/file-uploads' },
            { text: 'Naming Strategies', link: '/guide/naming-strategies' },
            { text: 'Signed URLs', link: '/guide/signed-urls' },
            { text: 'Testing', link: '/guide/testing' },
          ],
        },
      ],

      '/drivers/': [
        {
          text: 'Storage Drivers',
          items: [
            { text: 'Overview', link: '/drivers/' },
            { text: 'Local Filesystem', link: '/drivers/local' },
            { text: 'Amazon S3 (+ S3-compatible)', link: '/drivers/s3' },
            { text: 'Cloudflare R2', link: '/drivers/r2' },
            { text: 'Google Cloud Storage', link: '/drivers/gcs' },
            { text: 'Azure Blob Storage', link: '/drivers/azure' },
          ],
        },
        {
          text: 'Extensibility',
          items: [{ text: 'Custom Drivers', link: '/drivers/custom-drivers' }],
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'StorageService', link: '/api/storage-service' },
            { text: 'Interfaces & Types', link: '/api/interfaces' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/oxth/nestjs-storage' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present OxTH',
    },
  },
});
