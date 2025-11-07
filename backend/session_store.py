import os, redis, json
from datetime import datetime
import psycopg2

REDIS_URL = os.environ.get("REDIS_URL","redis://redis:6379/0")
r = redis.from_url(REDIS_URL, decode_responses=True)

def push_chat(user_id, session_id, query, response, risk_score=0):
    key = f"chat:{user_id}:{session_id}"
    r.rpush(key, json.dumps({"q":query,"a":response,"ts":datetime.utcnow().isoformat(),"risk":risk_score}))
    r.expire(key, 60*60*24*30)  # keep 30 days in redis

def get_chat(user_id, session_id):
    key = f"chat:{user_id}:{session_id}"
    items = r.lrange(key,0,-1)
    return [json.loads(x) for x in items]

# optional: persist to Postgres for immutability
def persist_audit(conn_params, user_id, session_id, query, response, risk_score):
    conn = psycopg2.connect(conn_params)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO session_logs (user_id, session_id, query, response, risk_score) VALUES (%s,%s,%s,%s,%s)",
        (user_id, session_id, query, response, risk_score)
    )
    conn.commit()
    cur.close()
    conn.close()
