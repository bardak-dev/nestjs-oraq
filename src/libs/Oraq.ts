import Redis             from 'ioredis';
import {randomBytes}     from 'crypto';
import Coordinator       from './Coordinator';
import {ORAQ_DEFAULT_ID} from '../oraq.constant';

export class Oraq{
  _mode: 'limiter'|'queue';
  _ping: number;
  _timeout: number;
  _concurrency: number;
  _key: string;
  _keyProcessing: string;
  _keyPending: string;
  _lock: string;
  _client: Redis;
  _subscriber: Redis;
  _ready: null|Promise<unknown>;
  _isSubscribed: boolean;
  constructor(options){
    const {
      id=ORAQ_DEFAULT_ID,
      prefix='',
      connection,
      ping=60*1000,
      timeout=2*60*60*1000,
      concurrency=1,
      mode='queue'
    }=options||{};
    this._mode=mode;
    this._ping=ping;
    this._timeout=timeout;
    this._concurrency=concurrency;
    // keys for data store
    this._key=[prefix,id].join(':');
    this._keyProcessing=this._key+':processing';
    this._keyPending=this._key+':pending';
    // lock key suffix
    this._lock=':lock';
    // redis client
    this._client=new Redis(connection);
    // enable namespace events
    this._client.config('SET','notify-keyspace-events','Kgxl');
    // keyspace events subscriber
    this._subscriber=new Redis(connection);
    this._ready=null;
  }
  async _init(){
    if(this._ready===null){
      this._ready=new Promise((resolve,reject) => {
        this._subscriber.psubscribe(`__keyspace@0__:${this._key}*`,err => {
          if(err){
            reject(err);
          }else{
            resolve(true);
          }
        });
      });
    }
    return this._ready;
  }
  async limit(job,{jobId,jobData,lifo=false}: {
    jobId?: string,
    jobData?: unknown,
    lifo?: boolean
  }={}){
    if(!this._isSubscribed){
      await this._init();
    }
    jobId=jobId||(await new Promise<Buffer>((resolve,reject) => {
      randomBytes(16,(err,buffer) => {
        if(err){
          reject('error generating token');
        }
        resolve(buffer);
      });
    })).toString('hex');
    const coordinator=new Coordinator({
      jobId,
      client:this._client,
      concurrency:this._concurrency,
      keyPending:this._keyPending,
      keyProcessing:this._keyProcessing,
      timeout:this._timeout,
      lock:this._lock,
      mode:this._mode
    });
    const onKeyEvent=this._getOnKeyEvent(coordinator);
    try{
      let result;
      // add job to the pending queue
      await this._client
        .multi()
        .setex(`${this._keyPending}:${jobId}${this._lock}`,this._timeout*1.5/1000,'')
        [lifo? 'rpush': 'lpush'](this._keyPending,jobId)  // eslint-disable-line no-unexpected-multiline
        .exec();
      // listen processing key events
      this._subscriber.addListener('pmessage',onKeyEvent);
      // concurrency
      await coordinator.wait(this._ping);
      await coordinator.canRun;
      this._subscriber.removeListener('pmessage',onKeyEvent);
      coordinator.stopWait();
      // create lock key and keep it alive
      await coordinator.keepAlive(this._ping);
      // move job from pending to processing queue
      await this._client.multi()
        .lrem(this._keyPending,1,jobId)
        .lpush(this._keyProcessing,jobId)
        .del(`${this._keyPending}:${jobId}${this._lock}`)
        .exec();
      // run job
      result= await job(jobData);
      return result;
    }finally{
      // stop all timers and remove all listeners
      coordinator.stopKeepAlive();
      coordinator.stopWait();
      this._subscriber.removeListener('pmessage',onKeyEvent);
      // remove processing job id and lock key
      await this._client
        .multi()
        .lrem(this._keyProcessing,1,jobId)
        .del(`${this._keyProcessing}:${jobId}${this._lock}`)
        .exec();
    }
  }
  _getOnKeyEvent(coordinator: Coordinator): (a: unknown,b: string,c: string) => void{
    return (pattern,channel,message) => {
      if(message==='expired'&&channel.endsWith(this._lock)){
        for(const queueKey of [this._keyPending,this._keyProcessing]){
          const queueStart=`__keyspace@0__:${queueKey}:`;
          if(channel.startsWith(queueStart)){
            const expiredJobId=channel.slice(queueStart.length,-this._lock.length);
            this._client.lrem(queueKey,1,expiredJobId).catch(console.error);
          }
        }
      }else if(message==='lrem'){
        coordinator.wait(this._ping).catch(console.error);
      }
    };
  }
  async quit(): Promise<unknown>{
    await this._subscriber.quit();
    return this._client.quit();
  }
  async removeJobById(jobId: string): Promise<unknown>{
    return this._client
      .multi()
      .del(`${this._keyPending}:${jobId}${this._lock}`)
      .lrem(this._keyPending,1,jobId)
      .exec();
  }
}
