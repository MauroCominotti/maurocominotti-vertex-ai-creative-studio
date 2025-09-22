# --- Configuration Variables ---
export $(cat .env | xargs)

# --- Dump configuration variables into .yaml file needed to deploy ---
grep -vE '^\s*#|^\s*$' .env | sed -E 's/\s*#.*//' | sed -E 's/^([^=]+)=((["'\'']).*\3)$/\1: \2/ ; t ; s/^([^=]+)=(.*)$/\1: "\2"/' > env.yaml

# --- Give necessary permissions to trigger cloud run function from PubSub via Eventarc ---
# Adhere to documentation found at: https://cloud.google.com/run/docs/triggering/pubsub-triggers#gcloud
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member=serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com \
    --role=roles/run.invoker

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member=serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com \
    --role=roles/eventarc.eventReceiver

# --- Create a PubSub topic ---
gcloud pubsub topics create $VEO_REMOTE_EXECUTOR_PUBSUB_TOPIC_ID

# --- Deployment Command ---
gcloud functions deploy $VEO_REMOTE_EXECUTOR_FUNCTION_NAME \
  --gen2 \
  --runtime=python313 \
  --region=$REGION \
  --source=. \
  --entry-point=remote_veo_executor_cloud_function_entrypoint \
  --trigger-topic=$VEO_REMOTE_EXECUTOR_PUBSUB_TOPIC_ID \
  --env-vars-file=env.yaml \
  --timeout=540s \
  --memory=1Gi
