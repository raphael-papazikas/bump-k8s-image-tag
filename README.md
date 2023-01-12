<a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
# bump-k8s-image-tag
Updates container image tag in a k8s manifest repository and creates a pull request.

## Usage
### Inputs

| Param   | Description                                                                   |
|---------|-------------------------------------------------------------------------------|
| `owner` | The owner of the repository, can be either a username or an organization name |
| `repo`  | The repository                                                                |
| `PAT`   | A personal access token that has read-write access to this repository         |
| `image` | Regex that matches the image to update. Example `raphael-papazikas/backend*`  |
| `tag`   | To which tag should be updated                                                |
| `base`  | The base branch, defaults to `main`                                           |

### Example

```yaml
- name: Bump image tag
  uses: raphael-papazikas/bump-k8s-image-tag
  with:
    owner: raphael-papazikas
    repo: k8s-deployment
    PAT: <YOUR_PAT_HERE>
    image: raphael-papazikas/backend
    tag: 0.0.1
```
