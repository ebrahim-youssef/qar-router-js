import { expectTypeOf } from 'expect-type'
import { it } from 'vitest'
import { Reciters } from '../src/generated/recordings.js'
import type { AudioSource, AyahRequest, ReciterRef, RecordingClassRef, SourceRef } from '../src/index.js'

expectTypeOf(Reciters.MahmoudAlhusary).toMatchTypeOf<ReciterRef>()
expectTypeOf(Reciters.MahmoudAlhusary.Hafs.Murattal).toMatchTypeOf<RecordingClassRef>()
const source = { kind: 'source', id: 'everyAyah:19', provider: 'everyAyah', recordingClass: Reciters.MahmoudAlhusary.Hafs.Murattal, label: 'Husary' } as const satisfies SourceRef
const valid: AyahRequest = { ayah: '1:1', source }
expectTypeOf(valid).toMatchTypeOf<AyahRequest>()
// @ts-expect-error selection forms are mutually exclusive
const invalid: AyahRequest = { ayah: '1:1', source, reciter: 'mahmoud_alhusary' }
void invalid
expectTypeOf<AudioSource>().toMatchTypeOf<{ granularity: 'ayah' | 'surah'; representation: 'standalone' | 'segment' }>()
it('has compile-time API assertions', () => {})
