package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func handler(w http.ResponseWriter, r *http.Request) {
	instanceId := os.Getenv("CLOUDFLARE_DEPLOYMENT_ID")

	fmt.Fprintf(w, "Success from Deployment %s", instanceId)
}

func main() {
	http.HandleFunc("/", handler)
	http.HandleFunc("/container", handler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
