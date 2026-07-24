export type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

export type AugmentedRequired<
  T extends object,
  K extends keyof T = keyof T,
> = Omit<T, K> & Required<Pick<T, K>>;
