
export interface DuplexStream<T> {
  source: AsyncIterable<T>
  sink: (source: AsyncIterable<T>) => void
}
