
export interface AbortOptions {
  signal?: AbortSignal
}

export type Source<T> = AsyncIterable<T>
export interface Sink<T> { (source: AsyncIterable<T>): Promise<void> }

export interface DuplexStream<T> {
  source: Source<T>
  sink: Sink<T>
}
