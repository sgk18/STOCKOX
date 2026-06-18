//go:build ignore

package main

import (
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	home, err := os.UserHomeDir()
	fmt.Printf("UserHomeDir: %q, err: %v\n", home, err)
	fmt.Printf("USERPROFILE: %q\n", os.Getenv("USERPROFILE"))
	fmt.Printf("HOME: %q\n", os.Getenv("HOME"))

	artifactsDir := filepath.Join(home, ".gemini", "antigravity-ide", "brain", "c817a98b-59e1-4b46-90ad-b0f4693c8e58")
	fmt.Printf("Target dir: %q\n", artifactsDir)

	// Check if dir exists
	_, statErr := os.Stat(artifactsDir)
	fmt.Printf("Dir exists: %v\n", statErr == nil)

	// Try to write the file
	reportPath := filepath.Join(artifactsDir, "root_cause_analysis.md")
	content := "# Test Root Cause Report\n\nGenerated at: " + fmt.Sprintf("%v", os.Getenv("COMPUTERNAME"))
	err = os.WriteFile(reportPath, []byte(content), 0644)
	fmt.Printf("WriteFile error: %v\n", err)
	fmt.Printf("File written to: %q\n", reportPath)
}
