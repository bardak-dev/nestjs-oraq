export interface RedisClientOptions{
  port?: number;
  host?: string;
  password?: string;
  family?: number;
  db?: number;
}

export interface OraqModuleOptions{
  name?: string;
  prefix?: string
  id?: string
  redis?: RedisClientOptions
  concurrency?: number
  ping?: number
  timeout?: number
  mode?: 'limiter'|'queue'
}

export interface OraqModuleAsyncOption{
  useValue?: OraqModuleOptions[];
  useFactory?: (...args: any[]) => OraqModuleOptions[];
  inject?: any[];
}
