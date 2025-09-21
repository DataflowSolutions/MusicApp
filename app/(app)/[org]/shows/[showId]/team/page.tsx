import { getSupabaseServer } from '@/lib/supabase/server'
import { getShowTeam, getAvailablePeople } from '@/lib/actions/show-team'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Music, Building, Wrench, Mail, Phone, Plus } from 'lucide-react'
import TeamPageClient from './components/TeamPageClient'
import UnassignButton from './components/UnassignButton'

interface ShowTeamPageProps {
  params: Promise<{ org: string, showId: string }>
}

const getRoleIcon = (memberType: string | null) => {
  switch (memberType) {
    case 'Artist':
      return Music
    case 'Agent':
    case 'Manager':
      return Building
    case 'Crew':
      return Wrench
    default:
      return Users
  }
}

export default async function ShowTeamPage({ params }: ShowTeamPageProps) {
  const { org: orgSlug, showId } = await params
  
  const supabase = await getSupabaseServer()
  
  // Get organization and show details
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return <div>Organization not found</div>
  }

  const { data: show } = await supabase
    .from('shows')
    .select('id, title, date, org_id')
    .eq('id', showId)
    .eq('org_id', org.id)
    .single()

  if (!show) {
    return <div>Show not found</div>
  }

  // Get assigned team members and available people
  const assignedTeam = await getShowTeam(showId)
  const availablePeople = await getAvailablePeople(org.id)

  // Filter out already assigned people
  const unassignedPeople = availablePeople.filter(person => 
    !assignedTeam.some(assigned => assigned.id === person.id)
  )

  // Group assigned team by member type
  const artistTeam = assignedTeam.filter(person => person.member_type === 'Artist')
  const crewTeam = assignedTeam.filter(person => person.member_type === 'Crew')
  const promoterTeam = assignedTeam.filter(person => 
    person.member_type === 'Agent' || person.member_type === 'Manager'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Team Assignment</h1>
        <p className="text-muted-foreground">
          Assign people from your organization to this show: {show.title || 'Untitled Show'}
        </p>
        <p className="text-sm text-muted-foreground">
          Show Date: {new Date(show.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{assignedTeam.length}</p>
                <p className="text-xs text-muted-foreground">Total Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{artistTeam.length}</p>
                <p className="text-xs text-muted-foreground">Artists</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{crewTeam.length}</p>
                <p className="text-xs text-muted-foreground">Crew</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{promoterTeam.length}</p>
                <p className="text-xs text-muted-foreground">Promoter Team</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Team */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <CardTitle className="text-lg">Assigned Team ({assignedTeam.length})</CardTitle>
            </div>
            <TeamPageClient 
              showId={showId}
              availablePeople={unassignedPeople}
            />
          </div>
        </CardHeader>
        <CardContent>
          {assignedTeam.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No team members assigned to this show yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedTeam.map((person) => {
                const RoleIcon = getRoleIcon(person.member_type)
                return (
                  <div
                    key={person.id}
                    className="rounded-lg border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{person.name}</h4>
                          {person.member_type && (
                            <Badge variant="outline" className="text-xs">
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {person.member_type}
                            </Badge>
                          )}
                          {person.duty && (
                            <Badge variant="secondary" className="text-xs">
                              {person.duty}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {person.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span>{person.email}</span>
                            </div>
                          )}
                          {person.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{person.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        <UnassignButton 
                          showId={showId}
                          personId={person.id}
                          personName={person.name}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available People to Assign */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <CardTitle className="text-lg">Available People ({unassignedPeople.length})</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unassignedPeople.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">All available people have been assigned to this show</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unassignedPeople.map((person) => {
                const RoleIcon = getRoleIcon(person.member_type)
                return (
                  <div
                    key={person.id}
                    className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{person.name}</h4>
                          {person.member_type && (
                            <Badge variant="outline" className="text-xs">
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {person.member_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Available to Assign
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}