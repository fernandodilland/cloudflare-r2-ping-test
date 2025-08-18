#!/usr/bin/env python3
"""
Cloudflare R2 Test File Upload Script

This script uploads test files to multiple Cloudflare R2 buckets across different regions
with specific cache control headers for testing CDN caching behavior.
"""

import boto3
import os
import sys
from botocore.exceptions import ClientError, NoCredentialsError


def get_user_input():
    """
    Collect Cloudflare R2 credentials and bucket information from user input.
    
    Returns:
        tuple: Contains access_key_id, secret_access_key, endpoint_url, and bucket_names
    """
    print("Cloudflare R2 Upload Configuration")
    print("=" * 40)
    
    # Get Cloudflare R2 API credentials
    access_key_id = input("Enter your Cloudflare R2 Access Key ID: ").strip()
    secret_access_key = input("Enter your Cloudflare R2 Secret Access Key: ").strip()
    
    # Get R2 endpoint URL (account-specific)
    print("\nYour R2 endpoint should look like: https://[account-id].r2.cloudflarestorage.com")
    endpoint_url = input("Enter your Cloudflare R2 Endpoint URL: ").strip()
    
    # Define regions for bucket collection
    regions = [
        "Eastern Europe (EEUR)",
        "Western North America (WNAM)", 
        "Eastern North America (ENAM)",
        "Oceania (OC)",
        "Western Europe (WEUR)",
        "Asia Pacific (APAC)"
    ]
    
    bucket_names = {}
    print(f"\nEnter bucket names for each region:")
    print("-" * 40)
    
    for region in regions:
        bucket_name = input(f"Bucket name for {region}: ").strip()
        if not bucket_name:
            print(f"Warning: No bucket name provided for {region}, skipping...")
            continue
        bucket_names[region] = bucket_name
    
    return access_key_id, secret_access_key, endpoint_url, bucket_names


def create_r2_client(access_key_id, secret_access_key, endpoint_url):
    """
    Create and configure Cloudflare R2 client using boto3.
    
    Args:
        access_key_id (str): Cloudflare R2 access key ID
        secret_access_key (str): Cloudflare R2 secret access key
        endpoint_url (str): Cloudflare R2 endpoint URL
        
    Returns:
        boto3.client: Configured S3 client for R2
    """
    try:
        client = boto3.client(
            's3',
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            endpoint_url=endpoint_url,
            region_name='auto'  # Cloudflare R2 uses 'auto' as region
        )
        return client
    except Exception as e:
        print(f"Error creating R2 client: {e}")
        return None


def upload_file_with_cache_headers(client, bucket_name, file_path, object_key, cache_control):
    """
    Upload a file to R2 bucket with specific cache control headers.
    
    Args:
        client: boto3 S3 client configured for R2
        bucket_name (str): Name of the target bucket
        file_path (str): Local path to the file to upload
        object_key (str): Key/name for the object in the bucket
        cache_control (str): Cache-Control header value
        
    Returns:
        bool: True if upload successful, False otherwise
    """
    try:
        # Upload file with cache control headers
        client.upload_file(
            file_path,
            bucket_name,
            object_key,
            ExtraArgs={
                'Metadata': {
                    'uploaded-by': 'cloudflare-r2-ping-test-script',
                    'upload-timestamp': str(int(__import__('time').time()))
                },
                'CacheControl': cache_control,
                'ContentType': 'application/json'  # Since we're uploading JSON files
            }
        )
        return True
    except ClientError as e:
        print(f"Error uploading {object_key} to {bucket_name}: {e}")
        return False
    except FileNotFoundError:
        print(f"Error: File {file_path} not found")
        return False


def main():
    """
    Main function to orchestrate the file upload process.
    """
    print("Cloudflare R2 Test File Upload Script")
    print("=" * 50)
    print("This script will upload test files to multiple R2 buckets")
    print("with different cache control headers.\n")
    
    # Get user configuration
    access_key_id, secret_access_key, endpoint_url, bucket_names = get_user_input()
    
    if not access_key_id or not secret_access_key or not endpoint_url:
        print("Error: Missing required credentials. Exiting...")
        sys.exit(1)
    
    if not bucket_names:
        print("Error: No bucket names provided. Exiting...")
        sys.exit(1)
    
    # Create R2 client
    print("\nConnecting to Cloudflare R2...")
    r2_client = create_r2_client(access_key_id, secret_access_key, endpoint_url)
    
    if not r2_client:
        print("Failed to create R2 client. Exiting...")
        sys.exit(1)
    
    # Define files to upload and their cache headers
    files_config = [
        {
            'file_path': 'test-with-cache.json',
            'object_key': 'test-with-cache.json',
            'cache_control': 'public, s-maxage=31536000, max-age=0, must-revalidate',
            'description': 'File with CDN caching enabled (1 year s-maxage, no browser cache)'
        },
        {
            'file_path': 'test-without-cache.json',
            'object_key': 'test-without-cache.json', 
            'cache_control': 'no-store, no-cache, must-revalidate, max-age=0',
            'description': 'File with no caching anywhere'
        }
    ]
    
    # Verify files exist
    for file_config in files_config:
        if not os.path.exists(file_config['file_path']):
            print(f"Error: File {file_config['file_path']} not found in current directory")
            sys.exit(1)
    
    print(f"\nStarting upload to {len(bucket_names)} buckets...")
    print("-" * 50)
    
    # Upload files to each bucket
    total_uploads = 0
    successful_uploads = 0
    
    for region, bucket_name in bucket_names.items():
        print(f"\nUploading to {region} bucket: {bucket_name}")
        
        for file_config in files_config:
            file_path = file_config['file_path']
            object_key = file_config['object_key']
            cache_control = file_config['cache_control']
            description = file_config['description']
            
            print(f"  Uploading {file_path} ({description})...")
            
            total_uploads += 1
            
            if upload_file_with_cache_headers(
                r2_client, 
                bucket_name, 
                file_path, 
                object_key, 
                cache_control
            ):
                successful_uploads += 1
                print(f"    ✓ Successfully uploaded {object_key}")
            else:
                print(f"    ✗ Failed to upload {object_key}")
    
    # Summary
    print("\n" + "=" * 50)
    print("Upload Summary")
    print("=" * 50)
    print(f"Total upload attempts: {total_uploads}")
    print(f"Successful uploads: {successful_uploads}")
    print(f"Failed uploads: {total_uploads - successful_uploads}")
    
    if successful_uploads == total_uploads:
        print("\n🎉 All files uploaded successfully!")
    elif successful_uploads > 0:
        print(f"\n⚠️  Partial success: {successful_uploads}/{total_uploads} uploads completed")
    else:
        print("\n❌ No files were uploaded successfully")
    
    print("\nCache Control Headers Used:")
    print("- test-with-cache.json: public, s-maxage=31536000, max-age=0, must-revalidate")
    print("- test-without-cache.json: no-store, no-cache, must-revalidate, max-age=0")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nUpload cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1)
