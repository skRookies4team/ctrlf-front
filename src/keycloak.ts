import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "http://k8s-argocd-fronting-526db1f734-1347346656.ap-northeast-2.elb.amazonaws.com:8090",
  realm: "ctrlf",
  clientId: "web-app",
});

export default keycloak;
