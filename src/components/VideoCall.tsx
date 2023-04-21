import { useState, useEffect } from "react";
import {
  config,
  useClient,
  useMicrophoneAndCameraTracks,
  channelName,
} from "../settings";
import Controls from "./Controls";
import Video from "./Video";
import { Grid } from "@mui/material";
import {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";

interface VideoCallProps {
  setInCall: (inCall: boolean) => void;
}

function VideoCall(props: VideoCallProps) {
  const { setInCall } = props;
  const [users, setUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [start, setStart] = useState<boolean>(false);
  const client: IAgoraRTCClient = useClient();
  const { ready, tracks } = useMicrophoneAndCameraTracks();

  useEffect(() => {
    const init = async (name: string) => {
      client.on(
        "user-published",
        async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video") {
            setUsers((prevUsers: IAgoraRTCRemoteUser[]) => {
              return [...prevUsers, user];
            });
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        }
      );

      client.on(
        "user-unpublished",
        (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
          if (mediaType === "audio") {
            if (user.audioTrack) user.audioTrack.stop();
          }
          if (mediaType === "video") {
            setUsers((prevUsers) => {
              return prevUsers.filter((User) => User.uid !== user.uid);
            });
          }
        }
      );

      client.on("user-left", (user: IAgoraRTCRemoteUser) => {
        setUsers((prevUsers) => {
          return prevUsers.filter((User) => User.uid !== user.uid);
        });
      });

      try {
        // Check if the client is not already in connecting/connected state
        if (
          client.connectionState !== "CONNECTING" &&
          client.connectionState !== "CONNECTED"
        ) {
          await client.join(config.appId, name, config.token, null);
          // if (tracks) await client.publish([tracks[0]]); // Only publish the audio track
          if (tracks) await client.publish(tracks); // Publish both audio and video tracks
          setStart(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (ready && tracks) {
      try {
        init(channelName);
      } catch (error) {
        console.error(error);
      }
    }
  }, [channelName, client, ready, tracks]);

  return (
    <Grid container direction="column" style={{ height: "100%" }}>
      <Grid item style={{ height: "5%" }}>
        {ready && tracks && (
          <Controls tracks={tracks} setStart={setStart} setInCall={setInCall} />
        )}
      </Grid>
      <Grid item style={{ height: "95%" }}>
        {start && tracks && <Video tracks={tracks} users={users} />}
      </Grid>
    </Grid>
  );
}

export default VideoCall;
