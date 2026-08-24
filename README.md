# @qar/router-js

One API over four Quran audio providers. Ask for an ayah, a range, or a surah, and get back
normalized audio sources without caring which provider answered or how it names things.

This is not a player. It resolves and returns audio source data. Playback, caching, and UI are yours.

## The problem

Four providers describe the same recitation four different ways.

Take Mahmoud Khalil Al-Husary reciting Hafs, murattal.

| Provider | How it names this recitation |
| --- | --- |
| Quran Foundation, ayah API | recitation id `6` |
| Quran Foundation, surah API | chapter reciter id `6`, `qirat: "Hafs"`, `style: "Murattal"` |
| MP3Quran | reciter `118`, moshaf `118`, server `https://server13.mp3quran.net/husr/`, plus a comma joined list of which surahs exist |
| EveryAyah | `Husary_64kbps` and `Husary_128kbps`, and you build the filename yourself |

Those two `6`s are the trap. They are different ID spaces that happen to collide on one integer, and
crossing them gives you a different reciter. EveryAyah offers the same recitation at two bitrates,
which is a choice somebody has to make.

This package takes a curated catalog that has already reconciled those identities and gives you one
reference for the recitation, plus the routing to turn it into audio.

## Install

```bash
npm install @qar/router-js
```

## Use

```ts
import { getAyah, queryCatalog, Reciters } from '@qar/router-js'

const result = await getAyah({
  ayah: '2:255',
  recording: Reciters.MahmoudAlhusary.Hafs.Murattal,
})

result.sources[0]
// { granularity: 'ayah', representation: 'standalone',
//   url: 'https://everyayah.com/data/Husary_128kbps/002255.mp3',
//   verseKey: '2:255', provider: 'everyAyah', sourceId: 'everyAyah:20',
//   bitrate: '128kbps' }
```

You can supply less and let the package resolve the rest. It tells you what it decided.

```ts
const result = await getAyah({ ayah: '2:255', reciter: 'mishari_alafasy' })

result.resolved
// { recordingClass: { reciter: 'mishari_alafasy', riwayah: 'hafs', style: 'murattal' },
//   source: { id: 'everyAyah:15', provider: 'everyAyah', label: 'Alafasy', ... },
//   defaultsApplied: ['riwayah', 'style', 'source'] }
```

## Discovery

`queryCatalog()` answers what exists. It is synchronous and makes no network requests.

```ts
queryCatalog().reciters                                  // all 254
queryCatalog({ reciter: 'mahmoud_alhusary' }).riwayat
// ['aldouri_an_abiamr', 'hafs', 'qalun_an_nafi', 'warsh_an_nafi']
queryCatalog({ riwayah: 'warsh_an_nafi' }).reciters      // everyone who has it
```

Every result carries the matching recordings, the concrete provider sources behind them, and the
remaining facets, so you can drive a picker in whatever order suits your UI.

## Standalone and segment

The same ayah exists in two physical forms. EveryAyah stores one file per ayah. MP3Quran stores one
file per surah, and publishes timings so an ayah can be addressed as a range inside it.

```ts
await getAyah({ ayah: '2:255', reciter: 'muhammad_alminshawi', representation: 'segment' })
// { representation: 'segment', verseKey: '2:255',
//   url: 'https://server10.mp3quran.net/minsh/002.mp3',
//   startMs: 6797542, endMs: 6865419, provider: 'mp3Quran', ... }
```

Both satisfy the same request. The package does not pretend they are the same thing, and it never
stitches or transcodes anything.

## What it costs

EveryAyah ayah URLs and MP3Quran surah URLs are built from the catalog with no network call at all.
MP3Quran segments need one request for timings. Quran Foundation needs credentials and a request.

By default a call collects the free routes and only touches the network when the request cannot be
answered without it. Pass `alternatives: 'all'` when you want every representation and are willing to
pay for it.

## Quran Foundation

QF requires OAuth2 client credentials and is server side only. Its token endpoint sends no CORS
headers, and a client secret does not belong in a browser bundle, so QF lives behind a separate entry
point and the browser build rejects QF credentials rather than warning about them.

```ts
import { quranFoundation } from '@qar/router-js/server'
```

## Data

The catalog is generated from a separate curation pipeline and vendored into this package. It covers
254 reciters and 300 recitation combinations across 18 riwayat and 4 styles. Translations are
excluded. Catalog membership means the recording exists, not that every individual file will resolve.

## Status

Early. The core, EveryAyah, and MP3Quran are implemented and tested. Quran Foundation adapters and the
documentation site are in progress. Ayah ranges must stay within one surah for now.

## License

MIT
