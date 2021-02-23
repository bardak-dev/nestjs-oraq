import Redis from 'ioredis';

export class Coordinator{
  _jobId: string;
  _keepAliveTimeout: NodeJS.Timeout|null;
  _waitTimeout: NodeJS.Timeout|null;
  _concurrency: number;
  _client: Redis.Redis;
  _resolve: <T>(value: T|PromiseLike<T>) => void|null;
  _keyPending: string;
  _keyProcessing: string;
  _timeout: number;
  _lock: string;
  _mode: string;
  _startTime: number|null;
  _canRun: Promise<unknown>;
  constructor(options){
    this._validate(options);
    const {jobId,client,concurrency,keyPending,keyProcessing,timeout,lock,mode}=options;
    this._jobId=jobId;
    this._keepAliveTimeout=null;
    this._waitTimeout=null;
    this._concurrency=concurrency;
    this._client=client;
    this._resolve=null;
    this._keyPending=keyPending;
    this._keyProcessing=keyProcessing;
    this._timeout=timeout;
    this._lock=lock;
    this._mode=mode;
    this._startTime=null;
    this._canRun=new Promise(resolve => this._resolve=resolve);
  }
  _validate(options){
    if(!options){
      throw new Error('options are required');
    }
    if(typeof options.jobId!=='string'){
      throw new Error('jobId must be a string');
    }
    if(typeof options.keyPending!=='string'){
      throw new Error('keyPending must be a string');
    }
    if(typeof options.keyProcessing!=='string'){
      throw new Error('keyProcessing must be a string');
    }
    if(typeof options.lock!=='string'){
      throw new Error('lock must be a string');
    }
    if(!Number.isInteger(options.concurrency)){
      throw new Error('concurrency must be an integer');
    }
    if(!Number.isInteger(options.timeout)){
      throw new Error('timeout must be an integer');
    }
    if(!options.client){
      throw new Error('client is required');
    }
  }
  get canRun(){
    return this._canRun;
  }
  async keepAlive(ms: number){
    const lockKey=`${this._keyProcessing}:${this._jobId}${this._lock}`;
    this.stopKeepAlive();
    await this._client.setex(lockKey,ms*2/1000,'').catch(() => null);
    this._keepAliveTimeout=setTimeout(() => this.keepAlive(ms),ms);
  }
  stopKeepAlive(){
    if(this._keepAliveTimeout){
      clearTimeout(this._keepAliveTimeout);
      this._keepAliveTimeout=null;
    }
  }
  async wait(ms: number){
    this.stopWait();
    await this._setCanRun();
    this._waitTimeout=setTimeout(() => this.wait(ms),ms);
  }
  stopWait(){
    if(this._waitTimeout){
      clearTimeout(this._waitTimeout);
      this._waitTimeout=null;
    }
  }
  async _setCanRun(){
    if(!this._startTime){
      this._startTime=Date.now();
    }
    if(Date.now()-this._startTime>this._timeout){
      this._resolve(true);
      return;
    }
    await this._removeStuckJobs(this._keyPending);
    await this._removeStuckJobs(this._keyProcessing);
    const [llenRes,lindexRes]=await this._client
      .multi()
      .llen(this._keyProcessing)
      .lindex(this._keyPending,-1)
      .exec();
    const processingCount=llenRes[1];
    const nextJobId=lindexRes[1];
    if(processingCount<this._concurrency){
      switch(this._mode){
      case 'limiter':{
        this._resolve(true);
        break;
      }
      case 'queue':{
        if(nextJobId===this._jobId){
          this._resolve(true);
        }
        break;
      }
      }
    }
  }
  async _removeStuckJobs(queueKey: string){
    const jobIds=await this._client.lrange(queueKey,0,-1);
    let stuckJobs: Set<any>=new Set();
    if(!jobIds.length){
      return;
    }
    for(const jobId of jobIds){
      if(jobId){
        const existing=await this._client.exists(`${queueKey}:${jobId}${this._lock}`);
        if(!existing){
          stuckJobs.add(jobId);
        }
      }
    }
    if(!stuckJobs.size){
      return;
    }
    const pipe=this._client.multi();
    for(const jobId of stuckJobs){
      pipe.lrem(queueKey,0,jobId);
    }
    return pipe.exec().catch(() => null);
  }
}

export default Coordinator;
